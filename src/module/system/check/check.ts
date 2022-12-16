import { ActorPF2e, CharacterPF2e } from "@actor";
import { AttackTarget } from "@actor/types";
import { StrikeData, TraitViewData } from "@actor/data/base";
import { WeaponPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { ChatMessageSourcePF2e, CheckRollContextFlag, TargetFlag } from "@module/chat-message/data";
import { RollNotePF2e } from "@module/notes";
import { TokenDocumentPF2e } from "@scene";
import { eventToRollParams } from "@scripts/sheet-util";
import { ErrorPF2e, fontAwesomeIcon, objectHasKey, parseHTML, sluggify, traitSlugToObject } from "@util";
import { CheckModifier, StatisticModifier } from "@actor/modifiers";
import { CheckModifiersDialog } from "../check-modifiers-dialog";
import { CheckRoll, CheckRollDataPF2e } from "./roll";
import {
    DegreeAdjustmentsRecord,
    DegreeOfSuccess,
    DegreeOfSuccessString,
    DEGREE_OF_SUCCESS_STRINGS,
} from "../degree-of-success";
import { LocalizePF2e } from "../localize";
import { TextEditorPF2e } from "../text-editor";
import { CheckRollContext } from "./types";
import { StrikeAttackRoll } from "./strike/attack-roll";
import { isCheckContextFlag } from "@module/chat-message/helpers";

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
        context.createMessage ??= true;

        // System code must pass a set, but macros and modules may instead pass an array
        if (Array.isArray(context.options)) context.options = new Set(context.options);
        const rollOptions = context.options ?? new Set();

        // Figure out the default roll mode (if not already set by the event)
        if (rollOptions.has("secret")) context.rollMode ??= "blindroll";
        context.rollMode ??= game.settings.get("core", "rollMode");

        if (rollOptions.size > 0 && !context.isReroll) {
            check.calculateTotal(rollOptions);
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
        const RollCls = isStrike ? StrikeAttackRoll : CheckRoll;

        // Retrieve strike flags. Strikes need refactoring to use ids before we can do better
        const strike = (() => {
            const contextItem = context.item;
            if (isStrike && contextItem && context.actor) {
                const strikes: StrikeData[] = context.actor?.system.actions ?? [];
                const strike = strikes.find((a) => a.item?.id === contextItem.id && a.item.slug === contextItem.slug);

                if (strike) {
                    return {
                        actor: context.actor.uuid,
                        index: strikes.indexOf(strike),
                        damaging: !contextItem.isOfType("melee", "weapon") || contextItem.dealsDamage,
                        name: strike.item.name,
                        altUsage: context.altUsage,
                    };
                }
            }

            return null;
        })();

        const options: CheckRollDataPF2e = { rollerId: game.userId, isReroll, totalModifier: check.totalModifier };
        if (strike) options.strike = strike;

        const totalModifierPart = check.totalModifier === 0 ? "" : `+${check.totalModifier}`;
        const roll = await new RollCls(`${dice}${totalModifierPart}`, {}, options).evaluate({ async: true });

        // Combine all degree of success adjustments into a single record. Some may be overridden, but that should be
        // rare--and there are no rules for selecting among multiple adjustments.
        const dosAdjustments =
            context.dosAdjustments
                ?.filter((a) => a.predicate?.test(rollOptions) ?? true)
                .reduce((record, data) => {
                    for (const outcome of ["all", ...DEGREE_OF_SUCCESS_STRINGS] as const) {
                        if (data.adjustments[outcome]) {
                            record[outcome] = deepClone(data.adjustments[outcome]);
                        }
                    }
                    return record;
                }, {} as DegreeAdjustmentsRecord) ?? {};
        const degree = context.dc ? new DegreeOfSuccess(roll, context.dc, dosAdjustments) : null;

        if (degree) {
            context.outcome = DEGREE_OF_SUCCESS_STRINGS[degree.value];
            context.unadjustedOutcome = DEGREE_OF_SUCCESS_STRINGS[degree.unadjusted];
            roll.options.degreeOfSuccess = degree.value;
        }

        const notes = context.notes?.map((n) => (n instanceof RollNotePF2e ? n : new RollNotePF2e(n))) ?? [];
        const notesText =
            notes
                .filter((note) => {
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

            const header = document.createElement("h4");
            header.classList.add("action");
            header.innerHTML = check.slug;
            return [header, result ?? [], tags, notesText]
                .flat()
                .map((e) => (typeof e === "string" ? e : e.outerHTML))
                .join("");
        })();

        const contextFlag: CheckRollContextFlag = {
            ...context,
            item: undefined,
            dosAdjustments: undefined,
            actor: context.actor?.id ?? null,
            token: context.token?.id ?? null,
            domains: context.domains ?? [],
            target: context.target ? { actor: context.target.actor.uuid, token: context.target.token.uuid } : null,
            options: Array.from(rollOptions).sort(),
            notes: notes.filter((n) => n.predicate.test(rollOptions)).map((n) => n.toObject()),
            rollMode: context.rollMode ?? game.settings.get("core", "rollMode"),
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
        delete contextFlag.dosAdjustments;

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
                    strike,
                },
            };

            const speaker = ChatMessagePF2e.getSpeaker({ actor: context.actor, token: context.token });
            const { rollMode } = contextFlag;
            const create = context.createMessage;

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
        if (!isCheckContextFlag(context)) return;

        context.skipDialog = true;
        context.isReroll = true;

        const oldRoll = message.rolls.at(0);
        if (!(oldRoll instanceof CheckRoll)) throw ErrorPF2e("Unexpected error retrieving prior roll");

        const RollCls = oldRoll.constructor as typeof CheckRoll;
        const newData = deepClone(oldRoll.data);
        const newOptions = { ...oldRoll.options, isReroll: true };
        const newRoll = await new RollCls(oldRoll.formula, newData, newOptions).evaluate({ async: true });

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

        const dc = context.dc ?? null;
        const oldFlavor = message.flavor ?? "";
        const degree = dc ? new DegreeOfSuccess(newRoll, dc) : null;
        const useNewRoll = keptRoll === newRoll && !!degree;
        context.outcome = useNewRoll ? DEGREE_OF_SUCCESS_STRINGS[degree.value] : context.outcome;

        const newFlavor = useNewRoll
            ? await (async (): Promise<string> => {
                  const $parsedFlavor = $("<div>").append(oldFlavor);
                  const target = context.target ?? null;
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
        const targetData = await (async (): Promise<{ name: string; visible: boolean } | null> => {
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
            const canSeeName = canSeeTokenName || !game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");

            return {
                name: token?.name ?? targetActor?.name ?? "",
                visible: !!canSeeName,
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

            const visible = targetActor?.hasPlayerOwner || dc.visible || game.settings.get("pf2e", "metagame_showDC");

            if (typeof preadjustedDC !== "number" || circumstances.length === 0) {
                const labelKey = targetData
                    ? translations.DC.Label.WithTarget
                    : customLabel ?? translations.DC.Label.NoTarget;
                const dcValue = dc.slug === "ac" && targetAC ? targetAC.value : dc.value;
                const markup = game.i18n.format(labelKey, { dcType, dc: dcValue, target: targetData?.name ?? null });

                return { markup, visible };
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

            return { markup, visible, adjustment };
        })();

        // The result: degree of success (with adjustment if applicable) and visibility setting
        const resultData = ((): ResultFlavorTemplateData["result"] => {
            const offset = {
                value: new Intl.NumberFormat(game.i18n.lang, {
                    maximumFractionDigits: 0,
                    signDisplay: "always",
                    useGrouping: false,
                }).format(degree.rollTotal - dc.value),
                visible: dc.visible,
            };

            const checkOrAttack = sluggify(dc.scope ?? "Check", { camel: "bactrian" });
            const locPath = (checkOrAttack: string, dosKey: DegreeOfSuccessString) =>
                `PF2E.Check.Result.Degree.${checkOrAttack}.${dosKey}`;
            const unadjusted = game.i18n.localize(locPath(checkOrAttack, DEGREE_OF_SUCCESS_STRINGS[degree.unadjusted]));
            const [adjusted, locKey] = degree.adjustment
                ? [game.i18n.localize(locPath(checkOrAttack, DEGREE_OF_SUCCESS_STRINGS[degree.value])), "AdjustedLabel"]
                : [unadjusted, "Label"];

            const markup = game.i18n.format(`PF2E.Check.Result.${locKey}`, {
                adjusted,
                unadjusted,
                offset: offset.value,
            });
            const visible = game.settings.get("pf2e", "metagame_showResults");

            return { markup, visible };
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
            convertXMLNode(html, "target", { visible: targetData.visible, whose: "target" });
        }
        convertXMLNode(html, "dc", { visible: dcData.visible, whose: "target" });
        if (dcData.adjustment) {
            const { adjustment } = dcData;
            convertXMLNode(html, "preadjusted", { classes: ["unadjusted"] });

            // Add circumstance bonuses/penalties for tooltip content
            const adjustedNode = convertXMLNode(html, "adjusted", {
                classes: ["adjusted", adjustment.direction],
            });
            if (!adjustedNode) throw ErrorPF2e("Unexpected error processing roll template");
            adjustedNode.dataset.circumstances = JSON.stringify(adjustment.circumstances);
        }
        convertXMLNode(html, "unadjusted", {
            visible: resultData.visible,
            classes: degree.adjustment ? ["unadjusted"] : [DEGREE_OF_SUCCESS_STRINGS[degree.value]],
        });
        if (degree.adjustment) {
            const adjustedNode = convertXMLNode(html, "adjusted", {
                visible: resultData.visible,
                classes: [DEGREE_OF_SUCCESS_STRINGS[degree.value], "adjusted"],
            });
            if (!adjustedNode) throw ErrorPF2e("Unexpected error processing roll template");
            adjustedNode.dataset.adjustment = game.i18n.localize(degree.adjustment.label);
        }

        convertXMLNode(html, "offset", { visible: dcData.visible, whose: "target" });

        // If target and DC are both hidden from view, hide both
        if (!targetData?.visible && !dcData.visible) {
            const targetDC = html.querySelector<HTMLElement>(".target-dc");
            if (targetDC) targetDC.dataset.visibility = "gm";

            // If result is also hidden, hide everything
            if (!resultData.visible) {
                html.dataset.visibility = "gm";
            }
        }

        return html;
    }
}

interface CreateResultFlavorParams {
    degree: DegreeOfSuccess | null;
    target?: AttackTarget | TargetFlag | null;
}

interface ResultFlavorTemplateData {
    dc: {
        markup: string;
        visible: boolean;
        adjustment?: {
            preadjusted: number;
            direction: "increased" | "decreased" | "no-change";
            circumstances: { label: string; value: number }[];
        };
    };
    result: {
        markup: string;
        visible: boolean;
    };
}

interface CreateTagFlavorParams {
    check: CheckModifier;
    context: CheckRollContext;
    extraTags: string[];
}

export { CheckPF2e, CheckRollCallback };
