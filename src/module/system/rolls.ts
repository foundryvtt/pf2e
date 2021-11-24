import { CheckModifiersDialog } from "./check-modifiers-dialog";
import { ActorPF2e, CharacterPF2e } from "@actor";
import { ItemPF2e, WeaponPF2e } from "@item";
import { DamageRollModifiersDialog } from "./damage-roll-modifiers-dialog";
import { ModifierPF2e, StatisticModifier } from "../modifiers";
import { getDegreeOfSuccess, DegreeOfSuccessText, CheckDC } from "./check-degree-of-success";
import { DegreeAdjustment } from "@module/degree-of-success";
import { DamageTemplate } from "@system/damage/weapon";
import { RollNotePF2e } from "@module/notes";
import { ChatMessagePF2e } from "@module/chat-message";
import { ZeroToThree } from "@module/data";
import { fontAwesomeIcon } from "@util";
import { TokenDocumentPF2e } from "@scene";
import { UserPF2e } from "@module/user";
import { PredicatePF2e } from "./predication";
import { StrikeTrait } from "@actor/data/base";
import { ChatMessageDataPF2e } from "@module/chat-message/data";

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
    dc?: CheckDC | null;
    /** Callback called when the roll occurs. */
    callback?: (roll: Rolled<Roll>) => void;
    /** Other roll-specific options */
    getFormula?: true;
    /** Additional modifiers */
    modifiers?: ModifierPF2e[];
    /** The originating item of this attack, if any */
    item?: Embedded<ItemPF2e> | null;
}

export type FateString = "none" | "fortune" | "misfortune";

export interface CheckModifiersContext {
    /** Any options which should be used in the roll. */
    options?: string[];
    /** Any notes which should be shown for the roll. */
    notes?: RollNotePF2e[];
    /** If true, this is a secret roll which should only be seen by the GM. */
    secret?: boolean;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode;
    /** Should this roll be rolled with 'fortune' (2 dice, keep higher) or 'misfortune' (2 dice, keep lower)? */
    fate?: FateString;
    /** The actor which initiated this roll. */
    actor?: ActorPF2e;
    /** The token which initiated this roll. */
    token?: TokenDocumentPF2e;
    /** The user which initiated this roll. */
    user?: UserPF2e;
    /** The originating item of this attack, if any */
    item?: Embedded<ItemPF2e> | null;
    /** Optional title of the roll options dialog; defaults to the check name */
    title?: string;
    /** The type of this roll, like 'perception-check' or 'saving-throw'. */
    type?: string;
    /** Any traits for the check. */
    traits?: StrikeTrait[];
    /** Optional DC data for the check */
    dc?: CheckDC | null;
    /** Should the roll be immediately created as a chat message? */
    createMessage?: boolean;
    /** Skip the roll dialog regardless of user setting  */
    skipDialog?: boolean;
    /** Is the roll a reroll? */
    isReroll?: boolean;
}

interface ExtendedCheckModifersContext extends Omit<CheckModifiersContext, "actor" | "token" | "user"> {
    actor?: ActorPF2e | string;
    token?: TokenDocumentPF2e | string;
    user?: UserPF2e | string;
    outcome?: typeof DegreeOfSuccessText[number];
    unadjustedOutcome?: typeof DegreeOfSuccessText[number];
}

interface RerollOptions {
    heroPoint?: boolean;
    keep?: "new" | "best" | "worst";
}

export class CheckPF2e {
    /**
     * Roll the given statistic, optionally showing the check modifier dialog if 'Shift' is held down.
     */
    static async roll(
        check: StatisticModifier,
        context: CheckModifiersContext = {},
        event?: JQuery.Event,
        callback?: (
            roll: Rolled<Roll>,
            outcome: typeof DegreeOfSuccessText[number] | undefined,
            message: ChatMessagePF2e | ChatMessageDataPF2e
        ) => Promise<void> | void
    ): Promise<Rolled<Roll<RollDataPF2e>> | null> {
        if (context.options?.length && !context.isReroll) {
            context.isReroll = false;
            // toggle modifiers based on the specified options and re-apply stacking rules, if necessary
            check.modifiers.forEach((modifier) => {
                modifier.ignored = !PredicatePF2e.test(modifier.predicate, context.options);
            });
            check.applyStackingRules();

            // change default roll mode to blind GM roll if the 'secret' option is specified
            if (context.options.map((o) => o.toLowerCase()).includes("secret")) {
                context.secret = true;
            }
        }

        if (context) {
            const visible = (note: RollNotePF2e) => PredicatePF2e.test(note.predicate, context.options ?? []);
            context.notes = (context.notes ?? []).filter(visible);

            if (context.dc) {
                const { adjustments } = context.dc;
                if (adjustments) {
                    adjustments.forEach((adjustment) => {
                        const merge = adjustment.predicate
                            ? PredicatePF2e.test(adjustment.predicate, context.options ?? [])
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

        const userSettingQuickD20Roll = !game.user.getFlag("pf2e", "settings.showRollDialogs");
        if (userSettingQuickD20Roll === event?.shiftKey) {
            if (!context.skipDialog) {
                const dialogClosed = new Promise((resolve: (value: boolean) => void) => {
                    new CheckModifiersDialog(check, resolve, context).render(true);
                });
                const rolled = await dialogClosed;
                if (!rolled) return null;
            }
        }

        const options: string[] = [];
        const ctx: ExtendedCheckModifersContext = context;
        let dice = "1d20";
        ctx.fate ??= "none";
        if (ctx.fate === "misfortune") {
            dice = "2d20kl";
            options.push("PF2E.TraitMisfortune");
        } else if (ctx.fate === "fortune") {
            dice = "2d20kh";
            options.push("PF2E.TraitFortune");
        }

        const speaker: { actor?: ActorPF2e } = {};
        if (ctx.actor instanceof ActorPF2e) {
            speaker.actor = ctx.actor;
            ctx.actor = ctx.actor.id;
        }
        if (ctx.token instanceof TokenDocumentPF2e) {
            ctx.token = ctx.token.id;
        }
        if (ctx.user instanceof UserPF2e) {
            ctx.user = ctx.user.id;
        }
        const item = context.item;
        delete context.item;

        ctx.rollMode =
            ctx.rollMode ?? (ctx.secret ? "blindroll" : undefined) ?? game.settings.get("core", "rollMode") ?? "roll";

        const modifierBreakdown = check.modifiers
            .filter((m) => m.enabled)
            .map((m) => {
                const label = game.i18n.localize(m.label ?? m.name);
                return `<span class="tag tag_alt">${label} ${m.modifier < 0 ? "" : "+"}${m.modifier}</span>`;
            })
            .join("");

        const optionBreakdown = options
            .map((o) => `<span class="tag tag_secondary">${game.i18n.localize(o)}</span>`)
            .join("");

        const totalModifierPart = check.totalModifier === 0 ? "" : `+${check.totalModifier}`;
        const roll = await new Roll(`${dice}${totalModifierPart}`, check as RollDataPF2e).evaluate({ async: true });

        let flavor = `<strong>${check.name}</strong>`;
        if (ctx.type === "spell-attack-roll" && game.modules.get("pf2qr")?.active) {
            // Until the PF2eQR module uses the roll type instead of feeling around for "Attack Roll"
            flavor = flavor.replace(/^<strong>/, '<strong data-pf2qr-hint="Attack Roll">');
        }

        // Add the degree of success if a DC was supplied
        if (ctx.dc) {
            const degreeOfSuccess = getDegreeOfSuccess(roll, ctx.dc);
            const degreeOfSuccessText = DegreeOfSuccessText[degreeOfSuccess.value];
            ctx.outcome = degreeOfSuccessText;

            // Add degree of success to roll for the callback function
            roll.data.degreeOfSuccess = degreeOfSuccess.value;

            const needsDCParam =
                typeof ctx.dc.label === "string" && Number.isInteger(ctx.dc.value) && !ctx.dc.label.includes("{dc}");
            if (needsDCParam && ctx.dc.label) ctx.dc.label = `${ctx.dc.label.trim()}: {dc}`;

            const dcLabel = game.i18n.format(ctx.dc.label ?? "PF2E.DCLabel", { dc: ctx.dc.value });
            const showDC = ctx.dc.visibility ?? game.settings.get("pf2e", "metagame.showDC");
            flavor += `<div data-visibility="${showDC}"><b>${dcLabel}</b></div>`;

            const adjustment = (() => {
                switch (degreeOfSuccess.degreeAdjustment) {
                    case DegreeAdjustment.INCREASE_BY_TWO:
                        return game.i18n.localize("PF2E.TwoDegreesBetter");
                    case DegreeAdjustment.INCREASE:
                        return game.i18n.localize("PF2E.OneDegreeBetter");
                    case DegreeAdjustment.LOWER:
                        return game.i18n.localize("PF2E.OneDegreeWorse");
                    case DegreeAdjustment.LOWER_BY_TWO:
                        return game.i18n.localize("PF2E.TwoDegreesWorse");
                    default:
                        return null;
                }
            })();
            const adjustmentLabel = adjustment ? ` (${adjustment})` : "";
            ctx.unadjustedOutcome = DegreeOfSuccessText[degreeOfSuccess.unadjusted];

            const resultLabel = game.i18n.localize("PF2E.ResultLabel");
            const degreeLabel = game.i18n.localize(`PF2E.${ctx.dc.scope ?? "CheckOutcome"}.${degreeOfSuccessText}`);
            const showResult = ctx.dc.visibility ?? game.settings.get("pf2e", "metagame.showResults");
            const offsetLabel = (() => {
                return game.i18n.format("PF2E.ResultOffset", {
                    offset: new Intl.NumberFormat(game.i18n.lang, {
                        maximumFractionDigits: 0,
                        signDisplay: "always",
                        useGrouping: false,
                    }).format(roll.total - (ctx.dc.value ?? 0)),
                });
            })();
            flavor += `<div data-visibility="${showResult}" class="degree-of-success">`;
            flavor += `<b>${resultLabel}: <span class="${degreeOfSuccessText}">${degreeLabel} `;
            flavor += showResult === showDC ? offsetLabel : `<span data-visibility=${showDC}>${offsetLabel}</span>`;
            flavor += `</span></b> ${adjustmentLabel}`;
            flavor += "</div>";
        }

        const notes = (ctx.notes ?? [])
            .filter((note) => {
                if (!ctx.dc || note.outcome.length === 0) {
                    // Always show the note if the check has no DC or no outcome is specified.
                    return true;
                } else if (ctx.outcome && ctx.unadjustedOutcome) {
                    if (note.outcome.includes(ctx.outcome) || note.outcome.includes(ctx.unadjustedOutcome)) {
                        // Show the note if the specified outcome was achieved.
                        return true;
                    }
                }
                return false;
            })
            .map((note) => TextEditor.enrichHTML(note.text))
            .join("<br />");

        if (ctx.traits) {
            const traits: string = ctx.traits
                .map((trait) => {
                    trait.label = game.i18n.localize(trait.label);
                    return trait;
                })
                .sort((a: StrikeTrait, b: StrikeTrait) => a.label.localeCompare(b.label))
                .map((trait: StrikeTrait) => {
                    const $trait = $("<span>").addClass("tag").attr({ "data-trait": trait.name }).text(trait.label);
                    if (trait.description) $trait.attr({ "data-description": trait.description });
                    return $trait.prop("outerHTML");
                })
                .join("");

            const otherTags = ((): string[] => {
                if (item instanceof WeaponPF2e && item.isRanged) {
                    // Show the range increment for ranged weapons
                    const label = game.i18n.format("PF2E.Item.Weapon.RangeIncrementN", { range: item.range ?? 10 });
                    return [`<span class="tag tag_secondary">${label}</span>`];
                } else {
                    return [];
                }
            })().join("");
            flavor += `<div class="tags">\n${traits}\n${otherTags}</div><hr />`;
        }
        flavor += `<div class="tags">${modifierBreakdown}${optionBreakdown}</div>${notes}`;

        if (ctx.options && ctx.options.indexOf("incapacitation") > -1) {
            flavor += `<p class="compact-text"><strong>${game.i18n.localize("PF2E.TraitIncapacitation")}:</strong> `;
            flavor += `${game.i18n.localize("PF2E.TraitDescriptionIncapacitationShort")}</p>`;
        }

        const origin = item ? { uuid: item.uuid, type: item.type } : null;
        const message = (await roll.toMessage(
            {
                speaker: ChatMessage.getSpeaker(speaker),
                flavor,
                flags: {
                    core: {
                        canPopout: true,
                    },
                    pf2e: {
                        canReroll: !["fortune", "misfortune"].includes(ctx.fate),
                        context,
                        unsafe: flavor,
                        modifierName: check.name,
                        modifiers: check.modifiers,
                        origin,
                    },
                },
            },
            {
                rollMode: ctx.rollMode ?? "roll",
                create: ctx.createMessage === undefined ? true : ctx.createMessage,
            }
        )) as ChatMessagePF2e | ChatMessageDataPF2e;

        if (callback) {
            await callback(roll, ctx.outcome, message);
        }

        return roll;
    }

    /** Reroll a rolled check given a chat message. */
    static async rerollFromMessage(message: ChatMessagePF2e, { heroPoint = false, keep = "new" }: RerollOptions = {}) {
        if (!(message.isAuthor || game.user.isGM)) {
            ui.notifications.error(game.i18n.localize("PF2E.RerollMenu.ErrorCantDelete"));
            return;
        }

        const actor = game.actors.get(message.data.speaker.actor ?? "");
        let rerollFlavor = game.i18n.localize(`PF2E.RerollMenu.MessageKeep.${keep}`);
        if (heroPoint) {
            // If the reroll costs a hero point, first check if the actor has one to spare and spend it
            if (actor instanceof CharacterPF2e) {
                const heroPointCount = actor.heroPoints.value;
                if (heroPointCount) {
                    await actor.update({
                        "data.resources.heroPoints.value": Math.clamped(heroPointCount - 1, 0, 3),
                    });
                    rerollFlavor = game.i18n.format("PF2E.RerollMenu.MessageHeroPoint", { name: actor.name });
                } else {
                    ui.notifications.warn(game.i18n.format("PF2E.RerollMenu.WarnNoHeroPoint", { name: actor.name }));
                    return;
                }
            } else {
                ui.notifications.error(game.i18n.localize("PF2E.RerollMenu.ErrorNoActor"));
                return;
            }
        }

        const flags = duplicate(message.data.flags.pf2e);
        const modifiers = (flags.modifiers ?? []).map((modifier) => ModifierPF2e.fromObject(modifier));
        const check = new StatisticModifier(flags.modifierName ?? "", modifiers);
        const context = flags.context;
        if (context) {
            context.createMessage = false;
            context.skipDialog = true;
            context.isReroll = true;

            await CheckPF2e.roll(check, context, undefined, async (newRoll, _degreeOfSuccess, newMessage) => {
                if (!(newRoll instanceof Roll)) return;

                const oldRoll = message.roll;

                // Keep the new roll by default; Old roll is discarded
                let keepRoll = newRoll;
                let [oldRollClass, newRollClass] = ["pf2e-reroll-discard", ""];

                // Check if we should keep the old roll instead.
                if (
                    (keep === "best" && oldRoll.total > newRoll.total) ||
                    (keep === "worst" && oldRoll.total < newRoll.total)
                ) {
                    // If so, switch the css classes and keep the old roll.
                    [oldRollClass, newRollClass] = [newRollClass, oldRollClass];
                    keepRoll = oldRoll;
                }
                const renders = {
                    old: await CheckPF2e.renderReroll(oldRoll),
                    new: await CheckPF2e.renderReroll(newRoll),
                };

                const rerollIcon = fontAwesomeIcon(heroPoint ? "hospital-symbol" : "dice");
                rerollIcon.classList.add("pf2e-reroll-indicator");
                rerollIcon.setAttribute("title", rerollFlavor);

                await message.delete({ render: false });
                const newFlavor =
                    (newMessage instanceof ChatMessagePF2e ? newMessage.data.flavor : newMessage.flavor) ?? "";
                await keepRoll.toMessage(
                    {
                        content: `<div class="${oldRollClass}">${renders.old}</div><div class="pf2e-reroll-second ${newRollClass}">${renders.new}</div>`,
                        flavor: `${rerollIcon.outerHTML}${newFlavor}`,
                        speaker: message.data.speaker,
                        flags: {
                            pf2e: flags,
                        },
                    },
                    {
                        rollMode: context?.rollMode ?? "roll",
                    }
                );
            });
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

        if (die.total === 20) {
            rollHtml = CheckPF2e.insertNatOneAndNatTwentyIntoRollTemplate(rollHtml, "success");
        } else if (die.total === 1) {
            rollHtml = CheckPF2e.insertNatOneAndNatTwentyIntoRollTemplate(rollHtml, "failure");
        }

        return rollHtml;
    }

    /**
     * Takes a rendered roll and inserts the specified class for failure or success into it.
     * @param rollHtml - The prerendered roll template.
     * @param classToInsert - The specifier whether we want to have a success or failure.
     */
    static insertNatOneAndNatTwentyIntoRollTemplate(rollHtml: string, classToInsert: string): string {
        const classIdentifierDice = "dice-total";
        const locationOfDiceRoll = rollHtml.search(classIdentifierDice);
        const partBeforeClass = rollHtml.substr(0, locationOfDiceRoll);
        const partAfterClass = rollHtml.substr(locationOfDiceRoll, rollHtml.length);
        return partBeforeClass.concat(classToInsert, " ", partAfterClass);
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
    static roll(
        damage: DamageTemplate,
        context: ExtendedCheckModifersContext = {},
        _event: JQuery.Event | undefined,
        callback?: Function
    ) {
        if (context.options && context.options?.length > 0) {
            // change default roll mode to blind GM roll if the 'secret' option is specified
            if (context.options.map((o: string) => o.toLowerCase()).includes("secret")) {
                context.secret = true;
            }
        }
        DamageRollModifiersDialog.roll(damage, context, callback);
    }
}
