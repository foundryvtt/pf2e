/* global Application, ChatMessage */
/**
 * Dialog for excluding certain modifiers before rolling for damage.
 */

import { FormulaPreservingRoll } from "../../scripts/dice";

export class DamageRollModifiersDialog extends Application {

  damage: object;
  context: object;
  callback: any;

  /**
   * @param {object} damage
   * @param {object} context
   * @param {function} callback
   */
  constructor(damage, context, callback) {
    super({
      title: damage.name,
      template: 'systems/pf2e/templates/chat/check-modifiers-dialog.html', // change this later
      classes: ['dice-checks', 'dialog'],
      popOut: true,
      width: 380,
    });
    this.damage = damage;
    this.context = context;
    this.callback = callback;
  }

  /**
   * @param {object} damage
   * @param {object} context
   * @param {function} callback
   */
  static roll(damage, context, callback) {
    const options = damage.traits ?? [];
    const ctx = context ?? {};

    ctx.rollMode = ctx.rollMode
      ?? (ctx.secret ? 'blindroll' : undefined)
      ?? game.settings.get('core', 'rollMode')
      ?? 'roll';

    const baseStyle = 'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #999; border-radius: 3px; color: white; background: rgba(0, 0, 0, 0.45);';
    const baseBreakdown = `<span style="${baseStyle}">${game.i18n.localize('Base')} ${damage.base.diceNumber}${damage.base.dieSize} ${damage.base.damageType}</span>`;
    const modifierStyle = 'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #999; border-radius: 3px; background: rgba(0, 0, 0, 0.05);';
    const modifierBreakdown = [].concat(damage.diceModifiers).concat(damage.numericModifiers).filter(m => m.enabled).filter(m => !m.critical || context.outcome === 'criticalSuccess')
      .map((m) => {
        const modifier = (m.modifier === undefined || Number.isNaN(m.modifier)) ? '' : ` ${m.modifier < 0 ? '' : '+'}${m.modifier}`;
        const damageType = (m.damageType && m.damageType !== damage.base.damageType ? ` ${m.damageType}` : '');
        return `<span style="${modifierStyle}">${game.i18n.localize(m.name)}${modifier}${damageType}</span>`
      }).join('');

    const optionStyle = 'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #000000; border-radius: 3px; color: white; background: var(--secondary);';
    const optionBreakdown = options.map((o) => `<span style="${optionStyle}">${game.i18n.localize(CONFIG.weaponTraits[o])}</span>`)
      .join('');

    const formula = damage.formula[context.outcome ?? 'success'];
    const roll = new FormulaPreservingRoll(formula, damage).roll();
    roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: `<b>${damage.name}</b> (${context.outcome ?? 'success'})<div style="display: flex; flex-wrap: wrap;">${baseBreakdown}${modifierBreakdown}${optionBreakdown}</div>`
    }, {
      rollMode: ctx.rollMode ?? 'roll'
    });
    if (callback) {
      callback(roll);
    }
  }

  getData() {
    return {
      damage: this.damage,
    };
  }
}
