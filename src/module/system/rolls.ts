import { CheckModifiersDialog, CheckModifiersContext } from './check-modifiers-dialog';
import { DamageRollModifiersDialog } from './damage-roll-modifiers-dialog';
import { ModifierPredicate, StatisticModifier } from '../modifiers';
import { PF2CheckDC } from './check-degree-of-success';
import { DamageTemplate } from '@system/damage/weapon';
import { RollNotePF2e } from '@module/notes';
import { ChatMessagePF2e } from '@module/chat-message';
import { ZeroToThree } from '@module/data';

export interface RollDataPF2e extends RollData {
    totalModifier?: number;
    degreeOfSuccess?: ZeroToThree;
}

/** Possible parameters of a RollFunction */
export interface RollParameters {
    /** The triggering event */
    event?: JQuery.TriggeredEvent;
    /** Any options which should be used in the roll. */
    options?: string[];
    /** Optional DC data for the roll */
    dc?: PF2CheckDC;
    /** Callback called when the roll occurs. */
    callback?: (roll: Rolled<Roll>) => void;
    /** Other roll-specific options */
    getFormula?: true;
    [keys: string]: any;
}

interface RerollOptions {
    heroPoint?: boolean;
    keep?: 'new' | 'best' | 'worst';
}

export class CheckPF2e {
    /**
     * Roll the given statistic, optionally showing the check modifier dialog if 'Shift' is held down.
     */
    static async roll(
        check: StatisticModifier,
        context: CheckModifiersContext = {},
        event?: JQuery.Event,
        callback?: (roll: Rolled<Roll>) => void,
    ): Promise<ChatMessage | foundry.data.ChatMessageData<foundry.documents.BaseChatMessage> | undefined> {
        if (context.options?.length) {
            // toggle modifiers based on the specified options and re-apply stacking rules, if necessary
            check.modifiers.forEach((modifier) => {
                modifier.ignored = !ModifierPredicate.test(modifier.predicate, context.options);
            });
            check.applyStackingRules();

            // change default roll mode to blind GM roll if the 'secret' option is specified
            if (context.options.map((o) => o.toLowerCase()).includes('secret')) {
                context.secret = true;
            }
        }

        if (context) {
            const visible = (note: RollNotePF2e) => ModifierPredicate.test(note.predicate, context.options ?? []);
            context.notes = (context.notes ?? []).filter(visible);

            if (context.dc) {
                const { adjustments } = context.dc;
                if (adjustments) {
                    adjustments.forEach((adjustment) => {
                        const merge = adjustment.predicate
                            ? ModifierPredicate.test(adjustment.predicate, context.options ?? [])
                            : true;

                        if (merge) {
                            context.dc!.modifiers ??= {};
                            mergeObject(context.dc!.modifiers, adjustment.modifiers);
                        }
                    });
                }
            }
        }

        // if control (or meta) is held, set roll mode to blind GM roll
        if (event?.ctrlKey || event?.metaKey) {
            context.secret = true;
        }

        const userSettingQuickD20Roll = !game.user.getFlag('pf2e', 'settings.showRollDialogs');
        if (userSettingQuickD20Roll !== event?.shiftKey || context.skipDialog === true) {
            return await CheckModifiersDialog.roll(check, context, callback);
        } else {
            new CheckModifiersDialog(check, context, callback).render(true);
        }
        return;
    }

    /** Reroll a rolled check given a chat message. */
    static async rerollFromMessage(message: ChatMessagePF2e, { heroPoint = false, keep = 'new' }: RerollOptions = {}) {
        if (!(message.isAuthor || game.user.isGM)) {
            ui.notifications.error(game.i18n.localize('PF2E.RerollMenu.ErrorCantDelete'));
            return;
        }

        const actor = game.actors.get(message.data.speaker.actor ?? '');
        let rerollFlavor = game.i18n.localize(`PF2E.RerollMenu.MessageKeep.${keep}`);
        if (heroPoint) {
            // If the reroll costs a hero point, first check if the actor has one to spare and spend it
            if (actor?.data.type === 'character') {
                const heroPointCount = actor.data.data.attributes.heroPoints.rank;
                if (heroPointCount) {
                    await actor.update({
                        'data.attributes.heroPoints.rank': Math.clamped(heroPointCount - 1, 0, 3),
                    });
                    rerollFlavor = game.i18n.format('PF2E.RerollMenu.MessageHeroPoint', { name: actor.name });
                } else {
                    ui.notifications.warn(game.i18n.format('PF2E.RerollMenu.WarnNoHeroPoint', { name: actor.name }));
                    return;
                }
            } else {
                ui.notifications.error(game.i18n.localize('PF2E.RerollMenu.ErrorNoActor'));
                return;
            }
        }

        const flags = duplicate(message.data.flags.pf2e);
        if (flags) {
            const check = new StatisticModifier(flags.modifierName ?? '', flags.modifiers);
            const context = flags.context;
            if (context) {
                context.createMessage = false;
                context.skipDialog = true;
                flags.canReroll = false;
                const newMessage = (await CheckPF2e.roll(
                    check,
                    context,
                )) as foundry.data.ChatMessageData<foundry.documents.BaseChatMessage>;
                const oldRoll = message.roll;
                const newRoll = Roll.fromData(JSON.parse(newMessage.roll as string)) as Rolled<Roll<RollDataPF2e>>;

                // Keep the new roll by default; Old roll is discarded
                let keepRoll = newRoll;
                let [oldRollClass, newRollClass] = ['pf2e-reroll-discard', ''];

                // Check if we should keep the old roll instead.
                if (
                    (keep === 'best' && oldRoll.total > newRoll.total) ||
                    (keep === 'worst' && oldRoll.total < newRoll.total)
                ) {
                    // If so, switch the css classes and keep the old roll.
                    [oldRollClass, newRollClass] = [newRollClass, oldRollClass];
                    keepRoll = oldRoll;
                }
                await message.delete({ render: false });
                await keepRoll.toMessage(
                    {
                        content: `<div class="${oldRollClass}">${await CheckPF2e.renderReroll(
                            oldRoll!,
                        )}</div><div class='pf2e-reroll-second ${newRollClass}'>${await CheckPF2e.renderReroll(
                            newRoll,
                        )}</div>`,
                        flavor: `<i class='fa fa-dice pf2e-reroll-indicator' title="${rerollFlavor}"></i>${newMessage.flavor}`,
                        speaker: message.data.speaker,
                        flags: {
                            pf2e: flags,
                        },
                    },
                    {
                        rollMode: context?.rollMode ?? 'roll',
                    },
                );
            }
        }
    }

    /**
     * Renders the reroll.
     * This function is rather complicated, as we can unfortunately not pass any values to the renderChatMessage hook.
     * This results in the need to parse the failure and success classes used by foundry directly into the template.
     * Another point of concern is the reason, the render function of rolls does only return a string.
     * This means we cannot use any of the fancy js functions like getElementsByClass etc.
     * @param roll - The reroll that is to be rerendered
     */
    static async renderReroll(roll: Roll): Promise<string> {
        let rollHtml = await roll.render();

        if (roll.dice.length === 0) {
            return rollHtml;
        }

        const die = roll.dice[0];

        if (die.total == 20) {
            rollHtml = CheckPF2e.insertNatOneAndNatTwentyIntoRollTemplate(rollHtml, 'success');
        } else if (die.total == 1) {
            rollHtml = CheckPF2e.insertNatOneAndNatTwentyIntoRollTemplate(rollHtml, 'failure');
        }

        return rollHtml;
    }

    /**
     * Takes a rendered roll and inserts the specified class for failure or success into it.
     * @param rollHtml - The prerendered roll template.
     * @param classToInsert - The specifier whether we want to have a success or failure.
     */
    static insertNatOneAndNatTwentyIntoRollTemplate(rollHtml: string, classToInsert: string): string {
        const classIdentifierDice = 'dice-total';
        const locationOfDiceRoll = rollHtml.search(classIdentifierDice);
        const partBeforeClass = rollHtml.substr(0, locationOfDiceRoll);
        const partAfterClass = rollHtml.substr(locationOfDiceRoll, rollHtml.length);
        return partBeforeClass.concat(classToInsert, ' ', partAfterClass);
    }
}
/**
 * @category PF2
 */
export class DamageRollPF2e {
    /**
     * @param damage
     * @param context
     * @param event
     * @param callback
     */
    static roll(damage: DamageTemplate, context: any = {}, _event: JQuery.Event | undefined, callback?: Function) {
        if (context.options?.length > 0) {
            // change default roll mode to blind GM roll if the 'secret' option is specified
            if (context.options.map((o: string) => o.toLowerCase()).includes('secret')) {
                context.secret = true;
            }
        }
        DamageRollModifiersDialog.roll(damage, context, callback);
    }
}
