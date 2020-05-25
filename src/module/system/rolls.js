import { CheckModifiersDialog } from './check-modifiers-dialog.js';

export class PF2Check {
  /**
   * 
   * @param {PF2CheckModifier} check
   * @param {jQuery.Event} event
   */
  static roll(check, event) {
    const userSettingQuickD20Roll = ((game.user.data.flags.PF2e || {}).settings || {}).quickD20roll;
    if (userSettingQuickD20Roll !== event.shiftKey) {
      CheckModifiersDialog.roll(check);
    } else {
      new CheckModifiersDialog(check).render(true);
    }
  }
}
