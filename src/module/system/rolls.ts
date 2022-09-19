import { ActorPF2e, CharacterPF2e } from "@actor";
import { AttackTarget } from "@actor/creature/types";
import { StrikeData, TraitViewData } from "@actor/data/base";
import { ItemPF2e, WeaponPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { ChatMessageSourcePF2e } from "@module/chat-message/data";
import { ZeroToThree } from "@module/data";
import { RollNotePF2e, RollNoteSource } from "@module/notes";
import { RollSubstitution } from "@module/rules/synthetics";
import { TokenDocumentPF2e } from "@scene";
import { eventToRollParams } from "@scripts/sheet-util";
import { UserVisibility } from "@scripts/ui/user-visibility";
import { DamageCategorization, DamageRollContext, DamageRollModifiersDialog, DamageTemplate } from "@system/damage";
import { ErrorPF2e, fontAwesomeIcon, objectHasKey, parseHTML, sluggify, traitSlugToObject } from "@util";
import { CheckModifier, ModifierPF2e, StatisticModifier } from "../actor/modifiers";
import { Check } from "./check";
import { CheckModifiersDialog } from "./check-modifiers-dialog";
import { CheckRoll } from "./check/roll";
import {
    CheckDC,
    DegreeOfSuccess,
    DegreeOfSuccessString,
    DEGREE_ADJUSTMENTS,
    DEGREE_OF_SUCCESS_STRINGS,
} from "./degree-of-success";
import { LocalizePF2e } from "./localize";
import { PredicatePF2e } from "./predication";
import { TextEditorPF2e } from "./text-editor";

interface RollDataPF2e extends RollData {
    rollerId?: string;
    totalModifier?: number;
    isReroll?: boolean;
    degreeOfSuccess?: ZeroToThree;
    strike?: {
        actor: ActorUUID | TokenDocumentUUID;
        index: number;
        damaging?: boolean;
        name: string;
    };
}

/** Possible parameters of a RollFunction */
interface RollParameters {
    /** The triggering event */
    event?: JQuery.TriggeredEvent;
    /** Any options which should be used in the roll. */
    options?: string[] | Set<string>;
    /** Optional DC data for the roll */
    dc?: CheckDC | null;
    /** Callback called when the roll occurs. */
    callback?: (roll: Rolled<Roll>) => void;
    /** Additional modifiers */
    modifiers?: ModifierPF2e[];
}

interface StrikeRollParams extends RollParameters {
    /** Retrieve the formula of the strike roll without following through to the end */
    getFormula?: true;
    /** The strike is involve throwing a thrown melee weapon or to use the melee usage of a combination weapon */
    altUsage?: "thrown" | "melee" | null;
    /** Should this roll be rolled twice? If so, should it keep highest or lowest? */
    rollTwice?: RollTwiceOption;
}

type RollTwiceOption = "keep-higher" | "keep-lower" | false;

type AttackCheck = "attack-roll" | "spell-attack-roll";
type CheckType =
    | "check"
    | "counteract-check"
    | "initiative"
    | "skill-check"
    | "perception-check"
    | "saving-throw"
    | "flat-check"
    | AttackCheck;

interface BaseRollContext {
    /** Any options which should be used in the roll. */
    options?: Set<string>;
    /** Any notes which should be shown for the roll. */
    notes?: RollNotePF2e[];
    /** If true, this is a secret roll which should only be seen by the GM. */
    secret?: boolean;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode;
    /** If this is an attack, the target of that attack */
    target?: AttackTarget | null;
    /** Any traits for the check. */
    traits?: TraitViewData[];
    /** The outcome a roll (usually relevant only to rerolls) */
    outcome?: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null;
    /** The outcome prior to being changed by abilities raising or lowering degree of success */
    unadjustedOutcome?: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null;
    /** Should the roll be immediately created as a chat message? */
    createMessage?: boolean;
    /** Skip the roll dialog regardless of user setting  */
    skipDialog?: boolean;
}

interface CheckRollContext extends BaseRollContext {
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
    /** The domains this roll had, for reporting purposes */
    domains?: string[];
    /** Is the roll a reroll? */
    isReroll?: boolean;
    /** D20 results substituted for an actual roll */
    substitutions?: RollSubstitution[];
    /** Is the weapon used in this attack roll an alternative usage? */
    altUsage?: "thrown" | "melee" | null;
}

interface CheckTargetFlag {
    actor: ActorUUID | TokenDocumentUUID;
    token?: TokenDocumentUUID;
}

type ContextFlagOmission = "actor" | "altUsage" | "createMessage" | "item" | "notes" | "options" | "target" | "token";
interface CheckRollContextFlag extends Required<Omit<CheckRollContext, ContextFlagOmission>> {
    actor: string | null;
    token: string | null;
    item?: undefined;
    target: CheckTargetFlag | null;
    altUsage?: "thrown" | "melee" | null;
    notes: RollNoteSource[];
    options: string[];
}

interface RerollOptions {
    heroPoint?: boolean;
    keep?: "new" | "best" | "worst";
}

type CheckRollCallback = (
    roll: Rolled<CheckRoll>,
    outcome: DegreeOfSuccessString | null | undefined,
    message: ChatMessagePF2e
) => Promise<void> | void;

class CheckPF2e {
    /** Roll the given statistic, optionally showing the check modifier dialog if 'Shift' is held down. */
    static async roll(
        check: CheckModifier,
        context: CheckRollContext = {},
        event: JQuery.TriggeredEvent | null = null,
        callback?: CheckRollCallback
    ): Promise<Rolled<CheckRoll> | null> {
        // If event is supplied, merge into context
        // Eventually the event parameter will go away entirely
        if (event) mergeObject(context, eventToRollParams(event));
        context.skipDialog ??= !game.user.settings.showRollDialogs;

        // System code must pass a set, but macros and modules may instead pass an array
        if (Array.isArray(context.options)) context.options = new Set(context.options);
        const rollOptions = context.options ?? new Set();

        if (rollOptions.size > 0 && !context.isReroll) {
            check.calculateTotal(rollOptions);
        }

        if (context.dc) {
            const { adjustments } = context.dc;
            if (adjustments) {
                for (const adjustment of adjustments) {
                    const merge = adjustment.predicate ? PredicatePF2e.test(adjustment.predicate, rollOptions) : true;

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

        // Acquire the d20 roll expression and resolve fortune/misfortune effects
        const [dice, tagsFromDice] = ((): [string, string[]] => {
            const substitutions =
                context.substitutions?.filter((s) => (!s.ignored && s.predicate?.test(rollOptions)) ?? true) ?? [];
            const rollTwice = context.rollTwice ?? false;

            // Determine whether both fortune and misfortune apply to the check
            const fortuneMisfortune = new Set(
                substitutions
                    .map((s) => s.effectType)
                    .concat(rollTwice === "keep-higher" ? "fortune" : rollTwice === "keep-lower" ? "misfortune" : [])
                    .flat()
            );
            for (const trait of fortuneMisfortune) {
                rollOptions.add(trait);
            }

            const substitution = substitutions.at(-1);
            if (rollOptions.has("fortune") && rollOptions.has("misfortune")) {
                return ["1d20", ["PF2E.TraitFortune", "PF2E.TraitMisfortune"]];
            } else if (substitution) {
                const effectType = {
                    fortune: "PF2E.TraitFortune",
                    misfortune: "PF2E.TraitMisfortune",
                }[substitution.effectType];
                const extraTag = game.i18n.format("PF2E.SpecificRule.SubstituteRoll.EffectType", {
                    type: game.i18n.localize(effectType),
                    substitution: game.i18n.localize(substitution.label),
                });

                return [substitution.value.toString(), [extraTag]];
            } else if (context.rollTwice === "keep-lower") {
                return ["2d20kl", ["PF2E.TraitMisfortune"]];
            } else if (context.rollTwice === "keep-higher") {
                return ["2d20kh", ["PF2E.TraitFortune"]];
            } else {
                return ["1d20", []];
            }
        })();

        extraTags.push(...tagsFromDice);

        const isStrike = context.type === "attack-roll" && context.item?.isOfType("weapon", "melee");
        const RollCls = isStrike ? Check.StrikeAttackRoll : Check.Roll;

        const rollData: RollDataPF2e = (() => {
            const data: RollDataPF2e = { rollerId: game.userId, isReroll, totalModifier: check.totalModifier };

            const contextItem = context.item;
            if (isStrike && contextItem && context.actor?.isOfType("character", "npc")) {
                const strikes: StrikeData[] = context.actor.system.actions;
                const strike = strikes.find(
                    (a): a is StrikeData & { item: ItemPF2e } =>
                        a.item?.id === contextItem.id && a.item.slug === contextItem.slug
                );

                if (strike) {
                    data.strike = {
                        actor: context.actor.uuid,
                        index: strikes.indexOf(strike),
                        damaging: !contextItem.isOfType("melee", "weapon") || contextItem.dealsDamage,
                        name: strike.item.name,
                    };
                }
            }

            return data;
        })();

        const totalModifierPart = check.totalModifier === 0 ? "" : `+${check.totalModifier}`;
        const roll = await new RollCls(`${dice}${totalModifierPart}`, rollData).evaluate({ async: true });

        const degree = context.dc ? new DegreeOfSuccess(roll, context.dc) : null;

        if (degree) {
            context.outcome = DEGREE_OF_SUCCESS_STRINGS[degree.value];
            context.unadjustedOutcome = DEGREE_OF_SUCCESS_STRINGS[degree.unadjusted];
            roll.data.degreeOfSuccess = degree.value;
        }

        const notes =
            context.notes
                ?.filter((note) => {
                    if (!note.predicate.test(rollOptions)) return false;
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
                .map((n) => n.text)
                .join("\n") ?? "";

        const item = context.item ?? null;

        const flavor = await (async (): Promise<string> => {
            const result = await this.createResultFlavor({ degree, target: context.target ?? null });
            const tags = this.createTagFlavor({ check, context, extraTags });

            const incapacitationNote = (): HTMLElement => {
                const note = new RollNotePF2e({
                    selector: "all",
                    title: game.i18n.localize("PF2E.TraitIncapacitation"),
                    text: game.i18n.localize("PF2E.TraitDescriptionIncapacitationShort"),
                });
                return parseHTML(note.text);
            };
            const incapacitation =
                item?.isOfType("spell") && item.traits.has("incapacitation") ? incapacitationNote() : "";

            const header = document.createElement("h4");
            header.classList.add("action");
            header.innerHTML = check.slug;
            return [header, result ?? [], tags, notes, incapacitation]
                .flat()
                .map((e) => (typeof e === "string" ? e : e.outerHTML))
                .join("");
        })();

        const secret = context.secret ?? rollOptions.has("secret");

        const contextFlag: CheckRollContextFlag = {
            ...context,
            item: undefined,
            actor: context.actor?.id ?? null,
            token: context.token?.id ?? null,
            domains: context.domains ?? [],
            target: context.target ? { actor: context.target.actor.uuid, token: context.target.token.uuid } : null,
            options: Array.from(rollOptions).sort(),
            notes: (context.notes ?? []).filter((n) => n.predicate.test(rollOptions)).map((n) => n.toObject()),
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
                    modifierName: check.slug,
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
            await item.update({ system: { quantity: item.quantity - 1 } });
        }

        return roll;
    }

    private static createTagFlavor({ check, context, extraTags }: CreateTagFlavorParams): HTMLElement[] {
        interface TagObject {
            label: string;
            name?: string;
            description?: string;
        }

        const toTagElement = (tag: TagObject, cssClass: string | null = null): HTMLElement => {
            const span = document.createElement("span");
            span.classList.add("tag");
            if (cssClass) span.classList.add(`tag_${cssClass}`);

            span.innerText = tag.label;

            if (tag.name) span.dataset.slug = tag.name;
            if (tag.description) span.dataset.description = tag.description;

            return span;
        };

        const traits =
            context.traits
                ?.map((trait) => {
                    trait.label = game.i18n.localize(trait.label);
                    return trait;
                })
                .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
                .map((t) => toTagElement(t)) ?? [];

        const { item } = context;
        const itemTraits = item?.isOfType("weapon", "melee")
            ? Array.from(item.traits)
                  .map((t): TraitViewData => {
                      const obj = traitSlugToObject(t, CONFIG.PF2E.npcAttackTraits);
                      obj.label = game.i18n.localize(obj.label);
                      return obj;
                  })
                  .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
                  .map((t): HTMLElement => toTagElement(t, "alt"))
            : [];

        const properties = ((): HTMLElement[] => {
            if (item?.isOfType("weapon") && item.isRanged) {
                // Show the range increment for ranged weapons
                const range = item.rangeIncrement ?? 10;
                const label = game.i18n.format("PF2E.Item.Weapon.RangeIncrementN.Label", { range });
                return [
                    toTagElement(
                        { name: range.toString(), label, description: "PF2E.Item.Weapon.RangeIncrementN.Hint" },
                        "secondary"
                    ),
                ];
            } else {
                return [];
            }
        })();

        const traitsAndProperties = document.createElement("div");
        traitsAndProperties.className = "tags";
        if (itemTraits.length === 0 && properties.length === 0) {
            traitsAndProperties.append(...traits);
        } else {
            const verticalBar = document.createElement("hr");
            verticalBar.className = "vr";
            traitsAndProperties.append(...[traits, verticalBar, itemTraits, properties].flat());
        }

        const modifiers = check.modifiers
            .filter((m) => m.enabled)
            .map((modifier) => {
                const sign = modifier.modifier < 0 ? "" : "+";
                const label = `${modifier.label} ${sign}${modifier.modifier}`;
                return toTagElement({ name: modifier.slug, label }, "transparent");
            });
        const tagsFromOptions = extraTags.map((t) => toTagElement({ label: game.i18n.localize(t) }, "transparent"));
        const modifiersAndExtras = document.createElement("div");
        modifiersAndExtras.className = "tags";
        modifiersAndExtras.append(...modifiers, ...tagsFromOptions);

        return [traitsAndProperties, document.createElement("hr"), modifiersAndExtras];
    }

    /** Reroll a rolled check given a chat message. */
    static async rerollFromMessage(message: ChatMessagePF2e, { heroPoint = false, keep = "new" }: RerollOptions = {}) {
        if (!(message.isAuthor || game.user.isGM)) {
            ui.notifications.error(game.i18n.localize("PF2E.RerollMenu.ErrorCantDelete"));
            return;
        }

        const actor = game.actors.get(message.speaker.actor ?? "");
        let rerollFlavor = game.i18n.localize(`PF2E.RerollMenu.MessageKeep.${keep}`);
        if (heroPoint) {
            // If the reroll costs a hero point, first check if the actor has one to spare and spend it
            if (actor instanceof CharacterPF2e) {
                const heroPointCount = actor.heroPoints.value;
                if (heroPointCount) {
                    await actor.update({
                        "system.resources.heroPoints.value": Math.clamped(heroPointCount - 1, 0, 3),
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

        const systemFlags = deepClone(message.flags.pf2e);
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

        const dc = message.flags.pf2e.context?.dc ?? null;
        const oldFlavor = message.flavor ?? "";
        const degree = dc ? new DegreeOfSuccess(newRoll, dc) : null;
        const createNewFlavor = keptRoll === newRoll && !!degree;

        const newFlavor = createNewFlavor
            ? await (async (): Promise<string> => {
                  const $parsedFlavor = $("<div>").append(oldFlavor);
                  const target = message.flags.pf2e.context?.target ?? null;
                  const flavor = await this.createResultFlavor({ degree, target });
                  if (flavor) $parsedFlavor.find(".target-dc-result").replaceWith(flavor);
                  return $parsedFlavor.html();
              })()
            : oldFlavor;

        // If this was an initiative roll, apply the result to the current encounter
        const { initiativeRoll } = message.flags.core;
        if (initiativeRoll) {
            const combatant = message.token?.combatant;
            await combatant?.parent.setInitiative(combatant.id, newRoll.total);
        }

        await message.delete({ render: false });
        await keptRoll.toMessage(
            {
                content: `<div class="${oldRollClass}">${renders.old}</div><div class="pf2e-reroll-second ${newRollClass}">${renders.new}</div>`,
                flavor: `${rerollIcon.outerHTML}${newFlavor}`,
                speaker: message.speaker,
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

    private static async createResultFlavor({ degree, target }: CreateResultFlavorParams): Promise<HTMLElement | null> {
        if (!degree) return null;

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

            const canSeeTokenName = (token ?? new TokenDocumentPF2e(targetActor?.prototypeToken.toObject() ?? {}))
                .playersCanSeeName;
            const canSeeName = canSeeTokenName || !game.settings.get("pf2e", "metagame.tokenSetsNameVisibility");

            return {
                name: token?.name ?? targetActor?.name ?? "",
                visibility: canSeeName ? "all" : "gm",
            };
        })();

        const translations = LocalizePF2e.translations.PF2E.Check;

        // DC, circumstance adjustments, and the target's name
        const dcData = ((): ResultFlavorTemplateData["dc"] => {
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
        const resultData = ((): ResultFlavorTemplateData["result"] => {
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

        return html;
    }
}

interface CreateResultFlavorParams {
    degree: DegreeOfSuccess | null;
    target?: AttackTarget | CheckTargetFlag | null;
}

interface ResultFlavorTemplateData {
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

interface CreateTagFlavorParams {
    check: CheckModifier;
    context: CheckRollContext;
    extraTags: string[];
}

class DamageRollPF2e {
    static async roll(damage: DamageTemplate, context: DamageRollContext, callback?: Function) {
        // Change the base damage type in case it was overridden
        const baseDamageType = damage.formula[context.outcome ?? "success"]?.data.baseDamageType;
        damage.base.damageType = baseDamageType ?? damage.base.damageType;
        damage.base.category = DamageCategorization.fromDamageType(damage.base.damageType);

        // Change default roll mode to blind GM roll if the "secret" option is specified
        if (context.options.has("secret")) {
            context.secret = true;
        }

        await DamageRollModifiersDialog.roll(damage, context, callback);
    }
}

export {
    BaseRollContext,
    CheckPF2e,
    CheckRollCallback,
    CheckRollContext,
    CheckRollContextFlag,
    CheckType,
    DamageRollPF2e,
    RollDataPF2e,
    RollParameters,
    RollTwiceOption,
    StrikeRollParams,
};
