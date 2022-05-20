import { CheckModifiersDialog } from "./check-modifiers-dialog";
import { ActorPF2e, CharacterPF2e } from "@actor";
import { ItemPF2e, WeaponPF2e } from "@item";
import { CheckModifier, ModifierPF2e, StatisticModifier } from "../actor/modifiers";
import { CheckDC, DegreeOfSuccess, DEGREE_ADJUSTMENTS, DEGREE_OF_SUCCESS_STRINGS } from "./degree-of-success";
import { DamageCategorization, DamageRollContext, DamageRollModifiersDialog, DamageTemplate } from "@system/damage";
import { RollNotePF2e } from "@module/notes";
import { ChatMessagePF2e } from "@module/chat-message";
import { ZeroToThree } from "@module/data";
import { ErrorPF2e, fontAwesomeIcon, objectHasKey, parseHTML, sluggify } from "@util";
import { TokenDocumentPF2e } from "@scene";
import { PredicatePF2e } from "./predication";
import { StrikeData, StrikeTrait } from "@actor/data/base";
import { ChatMessageSourcePF2e } from "@module/chat-message/data";
import { eventToRollParams } from "@scripts/sheet-util";
import { AttackTarget } from "@actor/creature/types";
import { LocalizePF2e } from "./localize";
import { Check } from "./check";
import { UserVisibility } from "@scripts/ui/user-visibility";
import { TextEditorPF2e } from "./text-editor";
import { CheckRoll } from "./check/roll";
import { RollSubstitution } from "@module/rules/rule-element/data";

export interface RollDataPF2e extends RollData {
    rollerId?: string;
    totalModifier?: number;
    isReroll?: boolean;
    degreeOfSuccess?: ZeroToThree;
    strike?: {
        actor: ActorUUID | TokenDocumentUUID;
        index: number;
        name: string;
    };
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
    /** Should this roll be rolled twice? If so, should it keep highest or lowest? */
    rollTwice?: RollTwiceOption;
}

export type RollTwiceOption = "keep-higher" | "keep-lower" | false;

export type AttackCheck = "attack-roll" | "spell-attack-roll";
export type CheckType =
    | "check"
    | "counteract-check"
    | "initiative"
    | "skill-check"
    | "perception-check"
    | "saving-throw"
    | "flat-check"
    | AttackCheck;

export interface BaseRollContext {
    /** Any options which should be used in the roll. */
    options?: string[];
    /** Any notes which should be shown for the roll. */
    notes?: RollNotePF2e[];
    /** If true, this is a secret roll which should only be seen by the GM. */
    secret?: boolean;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode;
    /** If this is an attack, the target of that attack */
    target?: AttackTarget | null;
    /** Any traits for the check. */
    traits?: StrikeTrait[];
    /** The outcome a roll (usually relevant only to rerolls) */
    outcome?: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null;
    /** The outcome prior to being changed by abilities raising or lowering degree of success */
    unadjustedOutcome?: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null;
    /** Should the roll be immediately created as a chat message? */
    createMessage?: boolean;
    /** Skip the roll dialog regardless of user setting  */
    skipDialog?: boolean;
}

export interface CheckRollContext extends BaseRollContext {
    /** The type of this roll, like 'perception-check' or 'saving-throw'. */
    type?: CheckType;
    target?: AttackTarget | null;
    /** Should this roll be rolled twice? If so, should it keep highest or lowest? */
    rollTwice?: RollTwiceOption;
    /** The actor which initiated this roll. */
    actor?: ActorPF2e;
    /** The token which initiated this roll. */
    token?: TokenDocumentPF2e;
    /** The originating item of this attack, if any */
    item?: Embedded<ItemPF2e> | null;
    /** Optional title of the roll options dialog; defaults to the check name */
    title?: string;
    /** Optional DC data for the check */
    dc?: CheckDC | null;
    /** Is the roll a reroll? */
    isReroll?: boolean;
    /** D20 results substituted for an actual roll */
    substitutions?: RollSubstitution[];
}

interface CheckTargetFlag {
    actor: ActorUUID | TokenDocumentUUID;
    token?: TokenDocumentUUID;
}

type ContextFlagOmissions = "actor" | "token" | "item" | "target" | "createMessage";
export interface CheckRollContextFlag extends Required<Omit<CheckRollContext, ContextFlagOmissions>> {
    actor: string | null;
    token: string | null;
    item?: undefined;
    target: CheckTargetFlag | null;
    altUsage?: "melee" | "thrown";
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
        check: CheckModifier,
        context: CheckRollContext = {},
        event: JQuery.TriggeredEvent | null = null,
        callback?: (
            roll: Rolled<Roll>,
            outcome: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null | undefined,
            message: ChatMessagePF2e
        ) => Promise<void> | void
    ): Promise<Rolled<CheckRoll> | null> {
        // If event is supplied, merge into context
        // Eventually the event parameter will go away entirely
        if (event) mergeObject(context, eventToRollParams(event));
        context.skipDialog ??= !game.user.settings.showRollDialogs;

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

        const extraTags: string[] = [];
        const isReroll = context.isReroll ?? false;
        if (isReroll) context.rollTwice = false;
        const substitutions = context.substitutions ?? [];

        const dice = ((): string => {
            const substitution = substitutions.find(
                (s) => (!s.ignored && s.predicate?.test(context.options ?? [])) ?? true
            );

            if (substitution) {
                const effectType = {
                    fortune: "PF2E.TraitFortune",
                    misfortune: "PF2E.TraitMisfortune",
                }[substitution.effectType];

                extraTags.push(
                    game.i18n.format("PF2E.SpecificRule.SubstituteRoll.EffectType", {
                        type: game.i18n.localize(effectType),
                        substitution: game.i18n.localize(substitution.label),
                    })
                );
                return substitution.value.toString();
            } else if (context.rollTwice === "keep-lower") {
                extraTags.push("PF2E.TraitMisfortune");
                return "2d20kl";
            } else if (context.rollTwice === "keep-higher") {
                extraTags.push("PF2E.TraitFortune");
                return "2d20kh";
            } else {
                return "1d20";
            }
        })();

        const modifierBreakdown = check.modifiers
            .filter((m) => m.enabled)
            .map((m) => `<span class="tag tag_alt">${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}</span>`)
            .join("");

        const optionBreakdown = extraTags
            .map((o) => `<span class="tag tag_secondary">${game.i18n.localize(o)}</span>`)
            .join("");

        const totalModifierPart = check.totalModifier === 0 ? "" : `+${check.totalModifier}`;

        const isStrike = context.type === "attack-roll" && context.item?.isOfType("weapon", "melee");
        const RollCls = isStrike ? Check.StrikeAttackRoll : Check.Roll;

        const rollData: RollDataPF2e = (() => {
            const data: RollDataPF2e = { rollerId: game.userId, isReroll, totalModifier: check.totalModifier };

            const contextItem = context.item;
            if (isStrike && contextItem && context.actor?.isOfType("character", "npc")) {
                const strikes: StrikeData[] = context.actor.data.data.actions;
                const strike = strikes.find((a): a is StrikeData & { item: ItemPF2e } => a.item?.id === contextItem.id);

                if (strike) {
                    data.strike = {
                        actor: context.actor.uuid,
                        index: strikes.indexOf(strike),
                        name: strike.item.name,
                    };
                }
            }

            return data;
        })();

        const roll = await new RollCls(`${dice}${totalModifierPart}`, rollData).evaluate({ async: true });

        const degree = context.dc ? new DegreeOfSuccess(roll, context.dc) : null;

        if (degree) {
            context.outcome = DEGREE_OF_SUCCESS_STRINGS[degree.value];
            context.unadjustedOutcome = DEGREE_OF_SUCCESS_STRINGS[degree.unadjusted];
            roll.data.degreeOfSuccess = degree.value;
        }

        const noteRollData = context.item?.getRollData();
        const notes =
            context.notes
                ?.filter((note) => {
                    if (!PredicatePF2e.test(note.predicate, context.options ?? [])) return false;
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
                .map((n) => game.pf2e.TextEditor.enrichHTML(n.text, { rollData: noteRollData }))
                .join("<br />") ?? "";

        const item = context.item ?? null;

        const degreeFlavor = await this.createFlavorMarkup({ degree, target: context.target ?? null });
        let flavor = `<h4 class="action">${check.name}</h4>${degreeFlavor}`;

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
            rollMode: secret ? "blindroll" : context.rollMode ?? game.settings.get("core", "rollMode"),
            rollTwice: context.rollTwice ?? false,
            title: context.title ?? "PF2E.Check.Label",
            type: context.type ?? "check",
            traits: context.traits ?? [],
            substitutions,
            dc: context.dc ?? null,
            skipDialog: context.skipDialog ?? !game.user.settings.showRollDialogs,
            isReroll: context.isReroll ?? false,
            outcome: context.outcome ?? null,
            unadjustedOutcome: context.unadjustedOutcome ?? null,
        };
        delete contextFlag.item;
        if (item?.data.flags.pf2e.comboMeleeUsage) {
            contextFlag.altUsage = "melee";
        }

        type MessagePromise = Promise<ChatMessagePF2e | ChatMessageSourcePF2e>;
        const message = await ((): MessagePromise => {
            const origin = item && { uuid: item.uuid, type: item.type };
            const coreFlags: Record<string, unknown> = { canPopout: true };
            if (context.type === "initiative") coreFlags.initiativeRoll = true;
            const flags = {
                core: coreFlags,
                pf2e: {
                    context: contextFlag,
                    unsafe: flavor,
                    modifierName: check.name,
                    modifiers: check.modifiers,
                    origin,
                },
            };

            const speaker = ChatMessagePF2e.getSpeaker({ actor: context.actor, token: context.token });
            const { rollMode } = contextFlag;
            const create = context.createMessage ?? true;

            return roll.toMessage({ speaker, flavor, flags }, { rollMode, create }) as MessagePromise;
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
            await item.update({ data: { quantity: item.quantity - 1 } });
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

        const systemFlags = deepClone(message.data.flags.pf2e);
        const context = systemFlags.context;
        if (!context) return;

        context.skipDialog = true;
        context.isReroll = true;

        const oldRoll = message.roll;
        if (!(oldRoll instanceof CheckRoll)) throw ErrorPF2e("Unexpected error retrieving prior roll");

        const RollCls = message.roll.constructor as typeof Check.Roll;
        const newData = { ...oldRoll.data, isReroll: true };
        const newRoll = await new RollCls(oldRoll.formula, newData).evaluate({ async: true });

        // Keep the new roll by default; Old roll is discarded
        let keptRoll = newRoll;
        let [oldRollClass, newRollClass] = ["pf2e-reroll-discard", ""];

        // Check if we should keep the old roll instead.
        if ((keep === "best" && oldRoll.total > newRoll.total) || (keep === "worst" && oldRoll.total < newRoll.total)) {
            // If so, switch the css classes and keep the old roll.
            [oldRollClass, newRollClass] = [newRollClass, oldRollClass];
            keptRoll = oldRoll;
        }

        const renders = {
            old: await CheckPF2e.renderReroll(oldRoll, { isOld: true }),
            new: await CheckPF2e.renderReroll(newRoll, { isOld: false }),
        };

        const rerollIcon = fontAwesomeIcon(heroPoint ? "hospital-symbol" : "dice");
        rerollIcon.classList.add("pf2e-reroll-indicator");
        rerollIcon.setAttribute("title", rerollFlavor);

        const dc = message.data.flags.pf2e.context?.dc ?? null;
        const oldFlavor = message.data.flavor ?? "";
        const degree = dc ? new DegreeOfSuccess(newRoll, dc) : null;
        const createNewFlavor = keptRoll === newRoll && !!degree;

        const newFlavor = createNewFlavor
            ? await (async (): Promise<string> => {
                  const $parsedFlavor = $("<div>").append(oldFlavor);
                  const target = message.data.flags.pf2e.context?.target ?? null;
                  const flavor = await this.createFlavorMarkup({ degree, target });
                  $parsedFlavor.find(".target-dc-result").replaceWith(flavor);
                  return $parsedFlavor.html();
              })()
            : oldFlavor;

        // If this was an initiative roll, apply the result to the current encounter
        const { initiativeRoll } = message.data.flags.core;
        if (initiativeRoll) {
            const combatant = message.token?.combatant;
            await combatant?.parent.setInitiative(combatant.id, newRoll.total);
        }

        await message.delete({ render: false });
        await keptRoll.toMessage(
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
     * Renders the reroll, highlighting the old result if it was a critical success or failure
     * @param roll  The roll that is to be rerendered
     * @param isOld This is the old roll render, so remove damage or other buttons
     */
    static async renderReroll(roll: Rolled<Roll>, { isOld }: { isOld: boolean }): Promise<string> {
        const die = roll.dice.find((d): d is Die => d instanceof Die && d.faces === 20);
        if (typeof die?.total !== "number") throw ErrorPF2e("Unexpected error inspecting d20 term");

        const html = await roll.render();
        const element = parseHTML(`<div>${html}</div>`);

        // Remove the buttons if this is the discarded roll
        if (isOld) element.querySelector(".message-buttons")?.remove();

        if (![1, 20].includes(die.total)) return element.innerHTML;

        element.querySelector(".dice-total")?.classList.add(die.total === 20 ? "success" : "failure");

        return element.innerHTML;
    }

    private static async createFlavorMarkup({ degree, target }: CreateFlavorMarkupParams): Promise<string> {
        if (!degree) return "";

        const { dc } = degree;
        const needsDCParam = !!dc.label && Number.isInteger(dc.value) && !dc.label.includes("{dc}");
        const customLabel = needsDCParam ? `<dc>${dc.label}: {dc}</dc>` : dc.label ?? null;

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

        // Not actually included in the template, but used for creating other template data
        const targetData = await (async (): Promise<{ name: string; visibility: UserVisibility } | null> => {
            if (!target) return null;

            const token = await (async (): Promise<TokenDocumentPF2e | null> => {
                if (!target.token) return null;
                if (target.token instanceof TokenDocumentPF2e) return target.token;
                if (targetActor?.token) return targetActor.token;

                // This is from a context flag: get the actor via UUID
                return fromUuid(target.token);
            })();

            const canSeeTokenName = (token ?? new TokenDocumentPF2e(targetActor?.data.token.toObject() ?? {}))
                .playersCanSeeName;
            const canSeeName = canSeeTokenName || !game.settings.get("pf2e", "metagame.tokenSetsNameVisibility");

            return {
                name: token?.name ?? targetActor?.name ?? "",
                visibility: canSeeName ? "all" : "gm",
            };
        })();

        const translations = LocalizePF2e.translations.PF2E.Check;

        // DC, circumstance adjustments, and the target's name
        const dcData = ((): FlavorTemplateData["dc"] => {
            const dcType = game.i18n.localize(
                objectHasKey(translations.DC.Specific, dc.slug)
                    ? translations.DC.Specific[dc.slug]
                    : translations.DC.Unspecific
            );

            // Get any circumstance penalties or bonuses to the target's DC
            const targetAC = targetActor?.attributes.ac;
            const circumstances =
                dc.slug === "ac" && targetAC instanceof StatisticModifier
                    ? targetAC.modifiers.filter((m) => m.enabled && m.type === "circumstance")
                    : [];
            const preadjustedDC =
                circumstances.length > 0 && targetAC
                    ? targetAC.value - circumstances.reduce((total, c) => total + c.modifier, 0)
                    : targetAC?.value ?? null;

            const visibility = targetActor?.hasPlayerOwner
                ? "all"
                : dc.visibility ?? game.settings.get("pf2e", "metagame.showDC");

            if (typeof preadjustedDC !== "number" || circumstances.length === 0) {
                const labelKey = targetData
                    ? translations.DC.Label.WithTarget
                    : customLabel ?? translations.DC.Label.NoTarget;
                const dcValue = dc.slug === "ac" && targetAC ? targetAC.value : dc.value;
                const markup = game.i18n.format(labelKey, { dcType, dc: dcValue, target: targetData?.name ?? null });

                return { markup, visibility };
            }

            const adjustment = {
                preadjusted: preadjustedDC,
                direction:
                    preadjustedDC < dc.value ? "increased" : preadjustedDC > dc.value ? "decreased" : "no-change",
                circumstances: circumstances.map((c) => ({ label: c.label, value: c.modifier })),
            } as const;

            // If the adjustment direction is "no-change", the bonuses and penalties summed to zero
            const translation =
                adjustment.direction === "no-change"
                    ? translations.DC.Label.NoChangeTarget
                    : translations.DC.Label.AdjustedTarget;

            const markup = game.i18n.format(translation, {
                target: targetData?.name ?? game.user.name,
                dcType,
                preadjusted: preadjustedDC,
                adjusted: dc.value,
            });

            return { markup, visibility, adjustment };
        })();

        // The result: degree of success (with adjustment if applicable) and visibility setting
        const resultData = ((): FlavorTemplateData["result"] => {
            const offset = {
                value: new Intl.NumberFormat(game.i18n.lang, {
                    maximumFractionDigits: 0,
                    signDisplay: "always",
                    useGrouping: false,
                }).format(degree.rollTotal - dc.value),
                visibility: dc.visibility,
            };

            const adjustment = ((): string | null => {
                switch (degree.degreeAdjustment) {
                    case DEGREE_ADJUSTMENTS.INCREASE_BY_TWO:
                        return game.i18n.localize("PF2E.TwoDegreesBetter");
                    case DEGREE_ADJUSTMENTS.INCREASE:
                        return game.i18n.localize("PF2E.OneDegreeBetter");
                    case DEGREE_ADJUSTMENTS.LOWER:
                        return game.i18n.localize("PF2E.OneDegreeWorse");
                    case DEGREE_ADJUSTMENTS.LOWER_BY_TWO:
                        return game.i18n.localize("PF2E.TwoDegreesWorse");
                    default:
                        return null;
                }
            })();

            const checkOrAttack = sluggify(dc.scope ?? "Check", { camel: "bactrian" });
            const dosKey = DEGREE_OF_SUCCESS_STRINGS[degree.value];
            const degreeLabel = game.i18n.localize(`PF2E.Check.Result.Degree.${checkOrAttack}.${dosKey}`);

            const resultKey = adjustment ? "PF2E.Check.Result.AdjustedLabel" : "PF2E.Check.Result.Label";
            const markup = game.i18n.format(resultKey, { degree: degreeLabel, offset: offset.value, adjustment });
            const visibility = game.settings.get("pf2e", "metagame.showResults");

            return { markup, visibility };
        })();

        // Render the template and replace quasi-XML nodes with visibility-data-containing HTML elements
        const markup = await (async (): Promise<string> => {
            const rendered = await renderTemplate("systems/pf2e/templates/chat/check/target-dc-result.html", {
                target: targetData,
                dc: dcData,
                result: resultData,
            });
            const html = parseHTML(rendered);

            const { convertXMLNode } = TextEditorPF2e;
            if (targetData) {
                convertXMLNode(html, "target", { visibility: targetData.visibility, whose: "target" });
            }
            convertXMLNode(html, "dc", { visibility: dcData.visibility, whose: "target" });
            if (dcData.adjustment) {
                const { adjustment } = dcData;
                convertXMLNode(html, "preadjusted", { classes: ["preadjusted-dc"] });

                // Add circumstance bonuses/penalties for tooltip content
                const adjustedNode = convertXMLNode(html, "adjusted", {
                    classes: ["adjusted-dc", adjustment.direction],
                });
                if (!adjustedNode) throw ErrorPF2e("Unexpected error processing roll template");
                adjustedNode.dataset.circumstances = JSON.stringify(adjustment.circumstances);
            }
            convertXMLNode(html, "degree", {
                visibility: resultData.visibility,
                classes: [DEGREE_OF_SUCCESS_STRINGS[degree.value]],
            });
            convertXMLNode(html, "offset", { visibility: dcData.visibility, whose: "target" });

            if (["gm", "owner"].includes(dcData.visibility) && targetData?.visibility === dcData.visibility) {
                // If target and DC are both hidden from view, hide both
                const targetDC = html.querySelector<HTMLElement>(".target-dc");
                if (targetDC) targetDC.dataset.visibility = dcData.visibility;

                // If result is also hidden, hide everything
                if (resultData.visibility === dcData.visibility) {
                    html.dataset.visibility = dcData.visibility;
                }
            }

            return html.outerHTML;
        })();

        return markup;
    }
}

interface CreateFlavorMarkupParams {
    degree: DegreeOfSuccess | null;
    target?: AttackTarget | CheckTargetFlag | null;
}

interface FlavorTemplateData {
    dc: {
        markup: string;
        visibility: UserVisibility;
        adjustment?: {
            preadjusted: number;
            direction: "increased" | "decreased" | "no-change";
            circumstances: { label: string; value: number }[];
        };
    };
    result: {
        markup: string;
        visibility: UserVisibility;
    };
}

/**
 * @category PF2
 */
export class DamageRollPF2e {
    static async roll(damage: DamageTemplate, context: DamageRollContext, callback?: Function) {
        // Change the base damage type in case it was overridden
        const baseDamageType = damage.formula[context.outcome ?? "success"]?.data.baseDamageType;
        damage.base.damageType = baseDamageType ?? damage.base.damageType;
        damage.base.category = DamageCategorization.fromDamageType(damage.base.damageType);

        // Change default roll mode to blind GM roll if the "secret" option is specified
        if (context.options && context.options?.length > 0) {
            if (context.options.map((o: string) => o.toLowerCase()).includes("secret")) {
                context.secret = true;
            }
        }

        await DamageRollModifiersDialog.roll(damage, context, callback);
    }
}
