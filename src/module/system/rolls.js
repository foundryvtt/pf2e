/* eslint-disable max-classes-per-file */
import { CheckModifiersDialog } from './check-modifiers-dialog.js';
import { DamageRollModifiersDialog } from './damage-roll-modifiers-dialog.js';

export class PF2Check {
  /**
   * 
   * @param {PF2CheckModifier} check
   * @param {object} context
   * @param {jQuery.Event} event
   * @param {function} callback
   */
  static roll(check, context = {}, event, callback) {
    const userSettingQuickD20Roll = ((game.user.data.flags.PF2e || {}).settings || {}).quickD20roll;
    if (userSettingQuickD20Roll !== event.shiftKey) {
      CheckModifiersDialog.roll(check, context, callback);
    } else {
      new CheckModifiersDialog(check, context, callback).render(true);
    }
  }
}

export class PF2DamageRoll {
  /**
   * @param {object} damage
   * @param {object} context
   * @param {jQuery.Event} event
   * @param {function} callback
   */
  static roll(damage, context = {}, event, callback) {
    DamageRollModifiersDialog.roll(damage, context, callback);
  }
}
