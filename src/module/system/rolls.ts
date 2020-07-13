/* eslint-disable max-classes-per-file */
import { CheckModifiersDialog } from './check-modifiers-dialog';
import { DamageRollModifiersDialog } from './damage-roll-modifiers-dialog';
import { PF2ModifierPredicate } from '../modifiers';

export class PF2Check {
  /**
   * 
   * @param {PF2CheckModifier} check
   * @param {object} context
   * @param {jQuery.Event} event
   * @param {function} callback
   */
  static roll(check, context: any = {}, event, callback?) {
    // toggle modifiers based on the specified options and re-apply stacking rules, if necessary
    if (context?.options?.length > 0) {
      check.modifiers.forEach(modifier => {
        modifier.ignored = !new PF2ModifierPredicate(modifier.predicate ?? {}).test(context.options); // eslint-disable-line no-param-reassign
      });
      check.applyStackingRules();
    }

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
  static roll(damage, context = {}, event, callback?) {
    DamageRollModifiersDialog.roll(damage, context, callback);
  }
}
