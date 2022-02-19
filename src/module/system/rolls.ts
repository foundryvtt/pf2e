import { CheckModifiersDialog } from "./check-modifiers-dialog";
import { ActorPF2e, CharacterPF2e } from "@actor";
import { ItemPF2e, WeaponPF2e } from "@item";
import { DamageRollModifiersDialog } from "./damage-roll-modifiers-dialog";
import { ModifierPF2e, StatisticModifier } from "../modifiers";
import { getDegreeOfSuccess, DEGREE_OF_SUCCESS_STRINGS, CheckDC, DegreeOfSuccessData } from "./check-degree-of-success";
import { DegreeAdjustment } from "@module/degree-of-success";
import { DamageTemplate } from "@system/damage/weapon";
import { RollNotePF2e } from "@module/notes";
import { ChatMessagePF2e } from "@module/chat-message";
import { ZeroToThree } from "@module/data";
import { fontAwesomeIcon } from "@util";
import { TokenDocumentPF2e } from "@scene";
import { PredicatePF2e } from "./predication";
import { StrikeTrait } from "@actor/data/base";
import { ChatMessageSourcePF2e } from "@module/chat-message/data";
import { eventToRollParams } from "@scripts/sheet-util";
import { AttackTarget } from "@actor/creature/types";
import { DamageCategory } from "./damage/damage";

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
    /** Additional modifiers */
    modifiers?: ModifierPF2e[];
}

export interface StrikeRollParams extends RollParameters {
    /** Retrieve the formula of the strike roll without following through to the end */
    getFormula?: true;
    /** The strike is to use the melee usage of a combination weapon */
    meleeUsage?: boolean;
}

export type FateString = "none" | "fortune" | "misfortune";

export interface CheckRollContext {
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
    /** The originating item of this attack, if any */
    item?: Embedded<ItemPF2e> | null;
    /** If this is an attack, the target of that attack */
    target?: AttackTarget | null;
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
    /** The outcome a roll (usually relevant only to rerolls) */
    outcome?: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null;
    /** The outcome prior to being changed by abilities raising or lowering degree of success */
    unadjustedOutcome?: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null;
}

interface CheckTargetFlag {
    actor: ActorUUID | TokenDocumentUUID;
    token?: TokenDocumentUUID;
}

export interface CheckRollContextFlag extends Required<Omit<CheckRollContext, "actor" | "token" | "item" | "target">> {
    actor: string | null;
    token: string | null;
    item?: undefined;
    target: CheckTargetFlag | null;
}

interface RerollOptions {
    heroPoint?: boolean;
    keep?: "new" | "best" | "worst";
}

/** Parameters for CheckPF2e#progressDegreeOfSucess */
interface ProcessDegreeParams {
    roll: Rolled<Roll<RollDataPF2e>>;
    dc: CheckDC | null;
    target: AttackTarget | CheckTargetFlag | null;
}

/** Return of CheckPF2e#progressDegreeOfSucess */
interface ProcessedDegree {
    data: DegreeOfSuccessData;
    flavor: string;
}

export class CheckPF2e {
    /**
     * Roll the given statistic, optionally showing the check modifier dialog if 'Shift' is held down.
     */
    static async roll(
        check: StatisticModifier,
        context: CheckRollContext = {},
        event: JQuery.TriggeredEvent | null = null,
        callback?: (
            roll: Rolled<Roll>,
            outcome: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null | undefined,
            message: ChatMessagePF2e
        ) => Promise<void> | void
    ): Promise<Rolled<Roll<RollDataPF2e>> | null> {
        // If event is supplied, merge into context
        // Eventually the event parameter will go away entirely
        if (event) mergeObject(context, eventToRollParams(event));

        if (context.options?.length && !context.isReroll) {
            check.calculateTotal(context.options);
        }

        if (context.dc) {
            const { adjustments } = context.dc;
            if (adjustments) {
                for (const adjustment of adjustments) {
                    const merge = adjustment.predicate
                        ? PredicatePF2e.test(adjustment.predicate, context.options ?? [])
                        : true;

                    if (merge) {
                        context.dc.modifiers ??= {};
                        mergeObject(context.dc.modifiers, adjustment.modifiers);
                    }
                }
            }
        }

        if (!context.skipDialog) {
            const dialogClosed = new Promise((resolve: (value: boolean) => void) => {
                new CheckModifiersDialog(check, resolve, context).render(true);
            });
            const rolled = await dialogClosed;
            if (!rolled) return null;
        }

        const options: string[] = [];
        let dice = "1d20";
        if (context.fate === "misfortune") {
            dice = "2d20kl";
            options.push("PF2E.TraitMisfortune");
        } else if (context.fate === "fortune") {
            dice = "2d20kh";
            options.push("PF2E.TraitFortune");
        }

        const modifierBreakdown = check.modifiers
            .filter((m) => m.enabled)
            .map((m) => `<span class="tag tag_alt">${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}</span>`)
            .join("");

        const optionBreakdown = options
            .map((o) => `<span class="tag tag_secondary">${game.i18n.localize(o)}</span>`)
            .join("");

        const totalModifierPart = check.totalModifier === 0 ? "" : `+${check.totalModifier}`;
        const roll = await new Roll(`${dice}${totalModifierPart}`, check as RollDataPF2e).evaluate({ async: true });

        const degree = await this.processDegreeOfSuccess({
            roll,
            dc: context.dc ?? null,
            target: context.target ?? null,
        });

        if (degree) {
            context.outcome = DEGREE_OF_SUCCESS_STRINGS[degree.data.value];
            context.unadjustedOutcome = DEGREE_OF_SUCCESS_STRINGS[degree.data.unadjusted];
        }

        const notes =
            context.notes
                ?.filter((note) => {
                    if (!context.dc || note.outcome.length === 0) {
                        // Always show the note if the check has no DC or no outcome is specified.
                        return true;
                    } else if (context.outcome && context.unadjustedOutcome) {
                        if ([context.outcome, context.unadjustedOutcome].some((o) => note.outcome.includes(o))) {
                            // Show the note if the specified outcome was achieved.
                            return true;
                        }
                    }
                    return false;
                })
                .map((n) => game.pf2e.TextEditor.enrichHTML(n.text))
                .join("<br />") ?? "";

        const item = context.item ?? null;

        let flavor = `<strong>${check.name}</strong>${degree?.flavor ?? ""}`;

        if (context.traits) {
            const traits = context.traits
                .map((trait) => {
                    trait.label = game.i18n.localize(trait.label);
                    return trait;
                })
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((trait) => {
                    const $trait = $("<span>").addClass("tag").attr({ "data-trait": trait.name }).text(trait.label);
                    if (trait.description) $trait.attr({ "data-description": trait.description });
                    return $trait.prop("outerHTML");
                })
                .join("");

            const otherTags = ((): string[] => {
                if (item instanceof WeaponPF2e && item.isRanged) {
                    // Show the range increment for ranged weapons
                    const label = game.i18n.format("PF2E.Item.Weapon.RangeIncrementN", {
                        range: item.rangeIncrement ?? 10,
                    });
                    return [`<span class="tag tag_secondary">${label}</span>`];
                } else {
                    return [];
                }
            })().join("");
            flavor += `<div class="tags">\n${traits}\n${otherTags}</div><hr />`;
        }
        flavor += `<div class="tags">${modifierBreakdown}${optionBreakdown}</div>${notes}`;

        if (context.options?.includes("incapacitation")) {
            flavor += `<p class="compact-text"><strong>${game.i18n.localize("PF2E.TraitIncapacitation")}:</strong> `;
            flavor += `${game.i18n.localize("PF2E.TraitDescriptionIncapacitationShort")}</p>`;
        }

        const secret = context.secret ?? context.options?.includes("secret") ?? false;

        const contextFlag: CheckRollContextFlag = {
            ...context,
            item: undefined,
            actor: context.actor?.id ?? null,
            token: context.token?.id ?? null,
            target: context.target ? { actor: context.target.actor.uuid, token: context.target.token.uuid } : null,
            options: context.options ?? [],
            notes: (context.notes ?? []).filter((n) => PredicatePF2e.test(n.predicate, context.options ?? [])),
            secret,
            rollMode: context.rollMode ?? (secret ? "blindroll" : game.settings.get("core", "rollMode")),
            fate: context.fate ?? "none",
            title: context.title ?? "PF2E.Check.Label",
            type: context.type ?? "check",
            traits: context.traits ?? [],
            dc: context.dc ?? null,
            createMessage: context.createMessage ?? true,
            skipDialog: context.skipDialog ?? !game.user.settings.showRollDialogs,
            isReroll: context.isReroll ?? false,
            outcome: context.outcome ?? null,
            unadjustedOutcome: context.unadjustedOutcome ?? null,
        };
        delete contextFlag.item;

        type MessagePromise = Promise<ChatMessagePF2e | ChatMessageSourcePF2e>;
        const message = await ((): MessagePromise => {
            const origin = item && { uuid: item.uuid, type: item.type };
            const coreFlags: Record<string, unknown> = { canPopout: true };
            if (context.type === "initiative") coreFlags.initiativeRoll = true;
            const flags = {
                core: coreFlags,
                pf2e: {
                    canReroll: !["fortune", "misfortune"].includes(context.fate ?? ""),
                    context: contextFlag,
                    unsafe: flavor,
                    modifierName: check.name,
                    modifiers: check.modifiers,
                    origin,
                },
            };

            const speaker = ChatMessagePF2e.getSpeaker({ actor: context.actor, token: context.token });
            const { rollMode } = contextFlag;
            const create = contextFlag.createMessage;

            return roll.toMessage(
                {
                    speaker,
                    flavor,
                    flags,
                },
                {
                    rollMode,
                    create,
                }
            ) as MessagePromise;
        })();

        if (callback) {
            // Roll#toMessage with createMessage set to false returns a plain object instead of a ChatMessageData
            // instance in V9
            const msg = message instanceof ChatMessagePF2e ? message : new ChatMessagePF2e(message);
            await callback(roll, context.outcome, msg);
        }

        // Consume one unit of the weapon if it has the consumable trait
        const isConsumableWeapon = item instanceof WeaponPF2e && item.traits.has("consumable");
        if (isConsumableWeapon && item.actor.items.has(item.id) && item.quantity > 0) {
            await item.update({ "data.quantity.value": item.quantity - 1 });
        }

        return roll;
    }

    static async processDegreeOfSuccess({ roll, dc, target }: ProcessDegreeParams): Promise<ProcessedDegree | null> {
        if (!dc) return null;

        // Add degree of success to roll for the callback function
        const degreeOfSuccess = getDegreeOfSuccess(roll, dc);
        roll.data.degreeOfSuccess = degreeOfSuccess.value;

        const needsDCParam = typeof dc.label === "string" && Number.isInteger(dc.value) && !dc.label.includes("{dc}");
        if (needsDCParam && dc.label) dc.label = `${dc.label.trim()}: {dc}`;

        // Get any circumstance adjustments (penalties or bonuses) to the target's AC
        const targetActor = await (async (): Promise<ActorPF2e | null> => {
            if (!target?.actor) return null;
            if (target.actor instanceof ActorPF2e) return target.actor;

            // This is a context flag: get the actor via UUID
            const maybeActor = await fromUuid(target.actor);
            return maybeActor instanceof ActorPF2e
                ? maybeActor
                : maybeActor instanceof TokenDocumentPF2e
                ? maybeActor.actor
                : null;
        })();

        const targetAC = targetActor?.attributes.ac;
        const circumstances =
            targetAC instanceof StatisticModifier
                ? targetAC.modifiers.filter((m) => m.enabled && m.type === "circumstance")
                : null;
        const preadjustedDC =
            circumstances && targetAC
                ? targetAC.value - circumstances.reduce((total, c) => total + c.modifier, 0)
                : targetAC?.value ?? null;

        const showDC = targetActor?.hasPlayerOwner
            ? "all"
            : dc.visibility ?? game.settings.get("pf2e", "metagame.showDC");

        const dcMarkup = await (async (): Promise<string> => {
            // If no target, just show the DC
            if (!target?.token) {
                const dcLabel = game.i18n.format(dc.label ?? "PF2E.Check.DC", { dc: dc.value });
                return `<div data-visibility="${showDC}">${dcLabel}</div>`;
            }

            // Later there will need to be a different way of deciding between AC or DC, since not all
            // actor-targetted checks are against AC
            dc.label ??= game.i18n.localize(target.token ? "PF2E.Check.AC" : "PF2E.Check.DC");

            const targetToken = await (async (): Promise<TokenDocumentPF2e | null> => {
                if (!target?.token) return null;
                if (target.token instanceof TokenDocumentPF2e) return target.token;

                // This is from a context flag: get the actor via UUID
                return fromUuid(target.token);
            })();

            const targetName = targetToken?.name ?? targetActor?.name ?? "";
            const dcNumber = preadjustedDC ?? dc.value;
            const dcLabel = game.i18n.format(dc.label, { dc: dcNumber });
            const adjustedDCLabel =
                circumstances && typeof preadjustedDC === "number" && preadjustedDC !== dc.value
                    ? (() => {
                          const direction = preadjustedDC < dc.value ? "increased" : "decreased";
                          const adjustments = Handlebars.escapeExpression(
                              JSON.stringify(circumstances.map((c) => ({ label: c.label, value: c.modifier })))
                          );
                          const attributes = [
                              `class="adjusted-dc ${direction}"`,
                              `data-adjustments="${adjustments}"`,
                          ].join(" ");

                          return dcLabel.replace(
                              dcNumber.toString(),
                              [
                                  `<span class="preadjusted-dc">${preadjustedDC}</span>`,
                                  `<span ${attributes}>${dc.value}</span>`,
                              ].join(" ")
                          );
                      })()
                    : dcLabel;

            const targetDCLabel = game.i18n.format("PF2E.Check.TargetDC", {
                target: targetName,
                dcLabel: adjustedDCLabel,
            });

            return `<div data-visibility="${showDC}">${targetDCLabel}</div>`;
        })();

        let flavor = dcMarkup;

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
        const dosString = DEGREE_OF_SUCCESS_STRINGS[degreeOfSuccess.value];

        const resultLabel = game.i18n.localize("PF2E.ResultLabel");
        const degreeLabel = game.i18n.localize(`PF2E.${dc.scope ?? "CheckOutcome"}.${dosString}`);
        const showResult = dc.visibility ?? game.settings.get("pf2e", "metagame.showResults");
        const offsetLabel = (() => {
            return game.i18n.format("PF2E.ResultOffset", {
                offset: new Intl.NumberFormat(game.i18n.lang, {
                    maximumFractionDigits: 0,
                    signDisplay: "always",
                    useGrouping: false,
                }).format(roll.total - dc.value),
            });
        })();
        flavor += `<div data-visibility="${showResult}" class="degree-of-success">`;
        flavor += `<span>${resultLabel}: <span class="${dosString}">${degreeLabel} `;
        flavor += showResult === showDC ? offsetLabel : `<span data-visibility=${showDC}>${offsetLabel}</span>`;
        flavor += `</span></span> ${adjustmentLabel}`;
        flavor += "</div>";

        return {
            data: degreeOfSuccess,
            flavor: $('<div class="target-outcome">').append(flavor).prop("outerHTML"),
        };
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

        const systemFlags = deepClone(message.data.flags.pf2e);
        const context = systemFlags.context;
        if (!context) return;

        context.createMessage = false;
        context.skipDialog = true;
        context.isReroll = true;

        const oldRoll = message.roll;
        const newRoll: Rolled<Roll<RollDataPF2e>> = await new Roll(oldRoll.formula, oldRoll.data).evaluate({
            async: true,
        });

        // Keep the new roll by default; Old roll is discarded
        let keepRoll = newRoll;
        let [oldRollClass, newRollClass] = ["pf2e-reroll-discard", ""];

        // Check if we should keep the old roll instead.
        if ((keep === "best" && oldRoll.total > newRoll.total) || (keep === "worst" && oldRoll.total < newRoll.total)) {
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

        const newDegreeOfSuccess = await this.processDegreeOfSuccess({
            roll: newRoll,
            dc: message.data.flags.pf2e.context?.dc ?? null,
            target: message.data.flags.pf2e.context?.target ?? null,
        });

        const newFlavor = ((): string => {
            const oldFlavor = message.data.flavor ?? "";
            if (keepRoll === newRoll && newDegreeOfSuccess) {
                const $parsedFlavor = $("<div>").append(oldFlavor);
                console.debug($parsedFlavor.prop("outerHTML"));
                $parsedFlavor.find(".target-outcome").replaceWith(newDegreeOfSuccess.flavor);
                console.debug($parsedFlavor.html());
                return $parsedFlavor.html();
            }

            return oldFlavor;
        })();

        // If this was an initiative roll, apply the result to the current encounter
        const { initiativeRoll } = message.data.flags.core;
        if (initiativeRoll) {
            const combatant = message.token?.combatant;
            await combatant?.parent.setInitiative(combatant.id, newRoll.total);
        }

        await message.delete({ render: false });
        await keepRoll.toMessage(
            {
                content: `<div class="${oldRollClass}">${renders.old}</div><div class="pf2e-reroll-second ${newRollClass}">${renders.new}</div>`,
                flavor: `${rerollIcon.outerHTML}${newFlavor}`,
                speaker: message.data.speaker,
                flags: {
                    core: { initiativeRoll },
                    pf2e: systemFlags,
                },
            },
            {
                rollMode: context.rollMode ?? "publicroll",
            }
        );
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
    static roll(
        damage: DamageTemplate,
        context: CheckRollContext = {},
        _event?: JQuery.TriggeredEvent,
        callback?: Function
    ) {
        // Change the base damage type in case it was overridden
        const baseDamageType = damage.formula[context.outcome ?? "success"]?.data.baseDamageType;
        damage.base.damageType = baseDamageType ?? damage.base.damageType;
        damage.base.category = DamageCategory.fromDamageType(damage.base.damageType);

        // Change default roll mode to blind GM roll if the "secret" option is specified
        if (context.options && context.options?.length > 0) {
            if (context.options.map((o: string) => o.toLowerCase()).includes("secret")) {
                context.secret = true;
            }
        }

        DamageRollModifiersDialog.roll(damage, context, callback);
    }
}
