/* global ChatMessage, ui */
import { CheckModifiersDialog } from './check-modifiers-dialog';
import { DamageRollModifiersDialog } from './damage-roll-modifiers-dialog';
import { PF2ModifierPredicate } from '../modifiers';

interface RerollOptions {
    heroPoint?: boolean;
    keep?: 'new' | 'best' | 'worst';
};

export class PF2Check {
    /**
     * 
     * @param {PF2CheckModifier} check
     * @param {object} context
     * @param {jQuery.Event} event
     * @param {function} callback
     */
    static roll(check, context: any = {}, event, callback?) {
        if (context?.options?.length > 0) {
            // toggle modifiers based on the specified options and re-apply stacking rules, if necessary
            check.modifiers.forEach(modifier => {
                modifier.ignored = !new PF2ModifierPredicate(modifier.predicate ?? {}).test(context.options);
            });
            check.applyStackingRules();

            // change default roll mode to blind GM roll if the 'secret' option is specified
            if (context.options.map(o => o.toLowerCase()).includes('secret')) {
              context.secret = true;
            }
        }

        const userSettingQuickD20Roll = ((game.user.data.flags.PF2e || {}).settings || {}).quickD20roll;
        if (userSettingQuickD20Roll !== event.shiftKey) {
            CheckModifiersDialog.roll(check, context, callback);
        } else {
            new CheckModifiersDialog(check, context, callback).render(true);
        }
    }

    static async rerollFromMessage(message, {heroPoint=false, keep='new'}: RerollOptions = {} ) {
        if (!(message.isAuthor || game.user.isGM)) {
            ui.notifications.error(game.i18n.localize("PF2E.RerollMenu.ErrorCantDelete"));
            return;
        }

        const actor = game.actors.get(message.data.speaker.actor);
        let rerollFlavor = game.i18n.localize(`PF2E.RerollMenu.MessageKeep.${keep}`);
        if (heroPoint) {
            // If the reroll costs a hero point, first check if the actor has one to spare and spend it
            if (actor) {
                const heroPointCount = actor.data.data.attributes.heroPoints.rank;
                if (heroPointCount) {
                    await actor.update({
                        'data.attributes.heroPoints.rank': Math.clamped(heroPointCount - 1, 0, 3)
                    });
                    rerollFlavor = game.i18n.format('PF2E.RerollMenu.MessageHeroPoint', {name: actor.name});
                } else {
                    ui.notifications.warn(game.i18n.format("PF2E.RerollMenu.WarnNoHeroPoint", {name: actor.name}));
                    return;
                }
            } else {
                ui.notifications.error(game.i18n.localize("PF2E.RerollMenu.ErrorNoActor"));
                return;
            }
        }

        await message.delete();

        const oldRoll = message.roll;
        const newRoll = oldRoll.reroll();

        // Keep the new roll by default; Old roll is discarded
        let keepRoll = newRoll;
        let [oldRollClass, newRollClass] = ['pf2e-reroll-discard', ''];

        // Check if we should keep the old roll instead.
        if ((keep === 'best' && oldRoll.total > newRoll.total) || (keep === 'worst' && oldRoll.total < newRoll.total)) {
            // If so, switch the css classes and keep the old roll.
            [oldRollClass, newRollClass] = [newRollClass, oldRollClass];
            keepRoll = oldRoll;
        }

        const newMessage = await ChatMessage.create({
            roll: keepRoll,
            content: `<div class="${oldRollClass}">${await oldRoll.render()}</div><div class='pf2e-reroll-second ${newRollClass}'>${await newRoll.render()}</div>`,
            flavor: `<i class='fa fa-dice pf2e-reroll-indicator' title="${rerollFlavor}"></i>${message.data.flavor}`,
            sound: CONFIG.sounds.dice,
            speaker: message.data.speaker,
        }, {});
        await newMessage.setFlag('pf2e', 'canReroll', false);
    }
}

export class PF2DamageRoll {
    /**
     * @param {object} damage
     * @param {object} context
     * @param {jQuery.Event} event
     * @param {function} callback
     */
    static roll(damage, context: any = {}, event, callback?) {
        if (context?.options?.length > 0) {
            // change default roll mode to blind GM roll if the 'secret' option is specified
            if (context.options.map(o => o.toLowerCase()).includes('secret')) {
              context.secret = true;
            }
        }
        DamageRollModifiersDialog.roll(damage, context, callback);
    }
}
