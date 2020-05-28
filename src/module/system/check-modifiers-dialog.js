/**
 * Dialog for excluding certain modifiers before rolling a check.
 */
// eslint-disable-next-line import/prefer-default-export,no-undef
export class CheckModifiersDialog extends Application {

  /**
   * @param {PF2CheckModifier} check
   */
  constructor(check) {
    super({
      title: check.name,
      template: 'systems/pf2e/templates/chat/check-modifiers-dialog.html',
      popOut: true,
      width: 380,
    });
    this.check = check;
  }

  static defaultOptions() {
    return {
      classes: ['dice-roll', 'dialogue'],
    };
  }

  /**
   * @param {PF2CheckModifier} check
   */
  static roll(check) {
    const tagStyle = 'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #999; border-radius: 3px; background: rgba(0, 0, 0, 0.05);';
    const breakdown = check.modifiers.filter((m) => m.enabled)
      .map((m) => `<span style="${tagStyle}">${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}</span>`)
      .join('');
    const roll = new Roll(`1d20 + ${check.totalModifier}`, check).roll();
    roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: `<b>${check.name}</b><div style="display: flex; flex-wrap: wrap;">${breakdown}</div>`
    });
  }

  getData() {
    return this.check;
  }

  /**
   * @param {jQuery} html
   */
  activateListeners(html) {
    html.find('button').click((event) => {
      CheckModifiersDialog.roll(this.check);
      this.close();
    });

    html.find('.modifier-container').on('click', 'input[type=checkbox]', (event) => {
      const index = Number(event.currentTarget.getAttribute('data-modifier-index'));
      this.check.modifiers[index].ignored = event.currentTarget.checked;
      this.check.applyStackingRules();
      this.render();
    });
  }
}
