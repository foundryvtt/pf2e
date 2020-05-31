import { PF2Modifier } from '../modifiers.js';

/**
 * Dialog for excluding certain modifiers before rolling a check.
 */
// eslint-disable-next-line import/prefer-default-export,no-undef
export class CheckModifiersDialog extends Application {

  /**
   * @param {PF2CheckModifier} check
   * @param {function} callback
   */
  constructor(check, callback) {
    super({
      title: check.name,
      template: 'systems/pf2e/templates/chat/check-modifiers-dialog.html',
      classes: ['dice-roll', 'dialogue'],
      popOut: true,
      width: 380,
    });
    this.check = check;
    this.callback = callback;
  }

  /**
   * @param {PF2CheckModifier} check
   * @param {function} callback
   */
  static roll(check, callback) {
    const tagStyle = 'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #999; border-radius: 3px; background: rgba(0, 0, 0, 0.05);';
    const breakdown = check.modifiers.filter((m) => m.enabled)
      .map((m) => `<span style="${tagStyle}">${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}</span>`)
      .join('');
    const roll = new Roll(`1d20 + ${check.totalModifier}`, check).roll();
    roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: `<b>${check.name}</b><div style="display: flex; flex-wrap: wrap;">${breakdown}</div>`
    });
    if (callback) {
      callback(roll);
    }
  }

  getData() {
    return this.check;
  }

  /**
   * @param {jQuery} html
   */
  activateListeners(html) {
    html.find('.roll').click((event) => {
      CheckModifiersDialog.roll(this.check, this.callback);
      this.close();
    });

    html.find('.modifier-container').on('click', 'input[type=checkbox]', (event) => {
      const index = Number(event.currentTarget.getAttribute('data-modifier-index'));
      this.check.modifiers[index].ignored = event.currentTarget.checked;
      this.check.applyStackingRules();
      this.render();
    });

    html.find('.add-modifier-panel').on('click', '.add-modifier', (event) => this.onAddModifier(event));
  }

  /**
   * @param {jQuery.Event} event
   */
  onAddModifier(event) {
    const parent = $(event.currentTarget).parents('.add-modifier-panel');
    const value = Number(parent.find('.add-modifier-value').val());
    const name = parent.find('.add-modifier-name').val();
    const type = parent.find('.add-modifier-type').val();
    const errors = [];
    if (Number.isNaN(value)) {
      errors.push('Modifier value must be a number.');
    } else if (value === 0) {
      errors.push('Modifier value must not be zero.');
    }
    if (!name || !name.trim()) {
      errors.push('Modifier name is required.');
    }
    if (!type || !type.trim().length) {
      errors.push('Modifier type is required.');
    }
    if (!type && type === 'untyped' && value < 0) {
      errors.push('Only untyped penalties are allowed.');
    }
    if (errors.length > 0) {
      ui.notifications.error(errors.join(' '));
    } else {
      this.check.push(new PF2Modifier(name, value, type));
      this.render();
    }
  }
}
