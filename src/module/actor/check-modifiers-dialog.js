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
    });
    this.check = check;
  }

  /**
   * @param {PF2CheckModifier} check
   */
  static roll(check) {
    const breakdown = check.modifiers.filter((m) => m.enabled)
      .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      .join(', ');
    const roll = new Roll(`1d20 + ${check.totalModifier}`, check).roll();
    roll.toMessage({
      flavor: `<b>${check.name}</b><p>${breakdown}</p>`
    }, {
      rollMode: game.settings.get('core', 'rollMode')
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

    html.find('input[type=checkbox]').click((event) => {
      const index = Number(event.currentTarget.getAttribute('data-modifier-index'));
      this.check.modifiers[index].ignored = event.currentTarget.checked;
      this.check.applyStackingRules();
      this.render();
    });
  }
}
