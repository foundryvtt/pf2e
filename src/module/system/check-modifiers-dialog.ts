/* global Application, ChatMessage, Roll, ui */
import { PF2Modifier } from '../modifiers';

/**
 * Dialog for excluding certain modifiers before rolling a check.
 */
export class CheckModifiersDialog extends Application {
  check: any;
  context: any;
  callback: any;

  /**
   * @param {PF2CheckModifier} check
   * @param {object} context
   * @param {function} callback
   */
  constructor(check, context, callback) {
    super({
      title: check.name,
      template: 'systems/pf2e/templates/chat/check-modifiers-dialog.html',
      classes: ['dice-checks', 'dialog'],
      popOut: true,
      width: 380,
    });
    this.check = check;
    this.context = context ?? {}; // might include a reference to actor, so do not do mergeObject or similar
    this.callback = callback;
    if (this.context.secret) {
      this.context.rollMode = 'blindroll';
    } else {
      this.context.rollMode = game.settings.get('core', 'rollMode') ?? 'roll';
    }
  }

  /**
   * @param {PF2CheckModifier} check
   * @param {object} context
   * @param {function} callback
   */
  static async roll(check, context, callback) {
    const options = [];
    const ctx = context ?? {};

    let dice = '1d20';
    if (ctx.fate === 'misfortune') {
      dice = '2d20kl';
      options.push('PF2E.TraitMisfortune');
    } else if (ctx.fate === 'fortune') {
      dice = '2d20kh';
      options.push('PF2E.TraitFortune');
    }

    ctx.rollMode = ctx.rollMode
      ?? (ctx.secret ? 'blindroll' : undefined)
      ?? game.settings.get('core', 'rollMode')
      ?? 'roll';

    const modifierStyle = 'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #999; border-radius: 3px; background: rgba(0, 0, 0, 0.05);';
    const modifierBreakdown = check.modifiers.filter((m) => m.enabled)
      .map((m) => `<span style="${modifierStyle}">${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}</span>`)
      .join('');

    const optionStyle = 'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #000000; border-radius: 3px; color: white; background: var(--secondary);';
    const optionBreakdown = options.map((o) => `<span style="${optionStyle}">${game.i18n.localize(o)}</span>`)
      .join('');

    const totalModifierPart = check.totalModifier === 0 ? '' : `+${check.totalModifier}`;
    const roll = new Roll(`${dice}${totalModifierPart}`, check).roll();
    
    const message = await roll.toMessage({
      speaker: ctx.actor ? ChatMessage.getSpeaker({ actor: ctx.actor }) : ChatMessage.getSpeaker(),
      flavor: `<b>${check.name}</b><div style="display: flex; flex-wrap: wrap;">${modifierBreakdown}${optionBreakdown}</div>`,
    }, {
      rollMode: ctx.rollMode ?? 'roll'
    });
    await message.setFlag('pf2e', 'canReroll', !ctx.fate);
    if (callback) {
      callback(roll);
    }
  }

  getData() {
    const fortune = (this?.context?.fate === 'fortune');
    const misfortune = (this?.context?.fate === 'misfortune');
    const none = (fortune === misfortune);
    return {
      check: this.check,
      rollModes: CONFIG.Dice.rollModes,
      rollMode: this.context.rollMode,
      fortune,
      none,
      misfortune,
    };
  }

  /**
   * @param {jQuery} html
   */
  activateListeners(html) {
    html.find('.roll').click((event) => {
      this.context.fate = html.find("input[type=radio][name=fate]:checked").val();
      CheckModifiersDialog.roll(this.check, this.context, this.callback);
      this.close();
    });

    html.find('.modifier-container').on('click', 'input[type=checkbox]', (event) => {
      const index = Number(event.currentTarget.getAttribute('data-modifier-index'));
      this.check.modifiers[index].ignored = event.currentTarget.checked;
      this.check.applyStackingRules();
      this.render();
    });

    html.find('.add-modifier-panel').on('click', '.add-modifier', (event) => this.onAddModifier(event));

    html.find('[name=rollmode]').change(event => this.onChangeRollMode(event));
  }

  /**
   * @param {jQuery.Event} event
   */
  onAddModifier(event) {
    const parent = $(event.currentTarget).parents('.add-modifier-panel');
    const value = Number(parent.find('.add-modifier-value').val());
    const type = `${parent.find('.add-modifier-type').val()}`;
    let name = `${parent.find('.add-modifier-name').val()}`;
    const errors = [];
    if (Number.isNaN(value)) {
      errors.push('Modifier value must be a number.');
    } else if (value === 0) {
      errors.push('Modifier value must not be zero.');
    }
    if (!type || !type.trim().length) {
      errors.push('Modifier type is required.');
    }
    if (!name || !name.trim()) {
      name = game.i18n.localize(value < 0 ? `PF2E.PenaltyLabel.${type}` : `PF2E.BonusLabel.${type}`);
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

  /**
   * @param {jQuery.Event} event
   */
  onChangeRollMode(event) {
    this.context.rollMode = $(event.currentTarget).val() ?? 'roll';
  }
  
}
