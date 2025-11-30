import { ActorPF2e } from "@actor";
import { ResourceData } from "@actor/creature/types.ts";
import { TraitViewData } from "@actor/data/base.ts";
import { CheckModifier } from "@actor/modifiers.ts";
import type { RollOrigin, RollTarget } from "@actor/roll-context/types.ts";
import type { Rolled } from "@client/dice/_module.d.mts";
import type Die from "@client/dice/terms/die.d.mts";
import { createActionRangeLabel } from "@item/ability/helpers.ts";
import { reduceItemName } from "@item/helpers.ts";
import { ActorTokenFlag, ChatMessageSourcePF2e, CheckContextChatFlag } from "@module/chat-message/data.ts";
import { isCheckContextFlag } from "@module/chat-message/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import { TokenDocumentPF2e, type ScenePF2e } from "@scene";
import { treatWoundsMacroCallback } from "@scripts/macros/treat-wounds.ts";
import { StatisticDifficultyClass } from "@system/statistic/index.ts";
import {
    ErrorPF2e,
    createHTMLElement,
    fontAwesomeIcon,
    htmlQuery,
    objectHasKey,
    parseHTML,
    signedInteger,
    sluggify,
} from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import {
    DEGREE_OF_SUCCESS_STRINGS,
    DegreeAdjustmentsRecord,
    DegreeOfSuccess,
    DegreeOfSuccessString,
    type CheckDC,
} from "../degree-of-success.ts";
import { TextEditorPF2e } from "../text-editor.ts";
import { CheckModifiersDialog } from "./dialog.ts";
import { CheckRoll, CheckRollDataPF2e } from "./roll.ts";
import { CheckCheckContext } from "./types.ts";

interface RerollOptions {
    resource?: string;
    keep?: "new" | "higher" | "lower";
}

type CheckRollCallback = (
    roll: Rolled<CheckRoll>,
    outcome: DegreeOfSuccessString | null | undefined,
    message: ChatMessagePF2e,
    event: Event | null,
) => Promise<void> | void;

class Check {
    /** Roll the given statistic, optionally showing the check modifier dialog if 'Shift' is held down. */
    static async roll(
        check: CheckModifier,
        context: CheckCheckContext = {},
        event: Event | null = null,
        callback?: CheckRollCallback,
    ): Promise<Rolled<CheckRoll> | null> {
        if (context.origin === undefined && context.actor) {
            context.origin = {
                actor: context.actor,
                token: context.token ?? null,
                self: true,
                statistic: null,
                item: context.item ?? null,
                modifiers: check.modifiers,
            };
        }
        if (!context.origin?.actor && !context.target?.actor) {
            return null;
        }

        // If event is supplied, merge into context
        // Eventually the event parameter will go away entirely
        if (event) fu.mergeObject(context, eventToRollParams(event, { type: "check" }));
        context.skipDialog ??= !game.user.settings.showCheckDialogs;
        context.createMessage ??= true;

        // System code must pass a set, but macros and modules may instead pass an array
        if (Array.isArray(context.options)) context.options = new Set(context.options);
        const rollOptions = context.options ?? new Set();
        if (typeof context.mapIncreases === "number") {
            rollOptions.add(`map:increases:${context.mapIncreases}`);
        }

        // Figure out the default roll mode (if not already set by the event)
        // ignore the secret trait if the ignoreSecretTrait setting is enabled
        if (rollOptions.has("secret") && !game.pf2e.settings.metagame.secretChecks) {
            context.rollMode ??= game.user.isGM ? "gmroll" : "blindroll";
        }
        context.rollMode = objectHasKey(CONFIG.Dice.rollModes, context.rollMode)
            ? context.rollMode
            : game.settings.get("core", "rollMode");

        if (rollOptions.size > 0 && !context.isReroll) {
            check.calculateTotal(rollOptions);
        }

        context.substitutions ??= [];
        const requiredSubstitution = context.substitutions.find((s) => s.required && s.selected);
        if (requiredSubstitution) {
            for (const substitution of context.substitutions) {
                substitution.required = substitution === requiredSubstitution;
                substitution.selected = substitution === requiredSubstitution;
            }
        }

        // Show dialog if enabled. This has the side effect of mutating the context,
        // so assigning variables from the context should not be done before this point
        if (!context.skipDialog && context.type !== "flat-check") {
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
            const substitution = substitutions.find((s) => s.selected);
            const rollTwice = context.rollTwice ?? false;

            // Determine whether both fortune and misfortune apply to the check
            const fortuneMisfortune = new Set(
                [
                    substitution?.effectType,
                    rollTwice === "keep-higher" ? "fortune" : rollTwice === "keep-lower" ? "misfortune" : null,
                ].filter(R.isTruthy),
            );
            for (const trait of fortuneMisfortune) {
                rollOptions.add(trait);
            }

            if (rollOptions.has("fortune") && rollOptions.has("misfortune")) {
                for (const sub of substitutions) {
                    // Cancel all roll substitutions and recalculate
                    rollOptions.delete(`substitute:${sub.slug}`);
                    check.calculateTotal(rollOptions);
                }

                return ["1d20", ["PF2E.TraitFortune", "PF2E.TraitMisfortune"]];
            } else if (substitution) {
                const effectType = {
                    fortune: "PF2E.TraitFortune",
                    misfortune: "PF2E.TraitMisfortune",
                }[substitution.effectType];
                const extraTag = game.i18n.format("PF2E.SpecificRule.SubstituteRoll.EffectType", {
                    type: game.i18n.localize(effectType),
                    substitution: reduceItemName(game.i18n.localize(substitution.label)),
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

        const options: CheckRollDataPF2e = {
            type: context.type,
            identifier: context.identifier,
            action: context.action ? sluggify(context.action) || null : null,
            dice,
            domains: context.domains,
            isReroll,
            totalModifier: check.totalModifier,
            damaging: !!context.damaging,
            rollerId: game.userId,
            showBreakdown:
                context.type === "flat-check" ||
                game.pf2e.settings.metagame.breakdowns ||
                !!context.actor?.hasPlayerOwner,
        };

        const totalModifierPart = signedInteger(check.totalModifier, { emptyStringZero: true });
        const allowInteractive = context.rollMode !== "blindroll";
        const roll = await new CheckRoll(`${dice}${totalModifierPart}`, {}, options).evaluate({ allowInteractive });

        // Collect the check specific options. These only exist for DoS Adjustments and notes
        const naturalTotal = roll.dice
            .map((d) => d.results.find((r) => r.active && !r.discarded)?.result ?? null)
            .find(R.isTruthy);
        const postRollOptions = [
            `check:total:${roll.total}`,
            `check:total:natural:${naturalTotal}`,
            // @todo migrate me
            // backwards compatibility
            `check:roll:total:natural:${naturalTotal}`,
        ];
        if (context.dc) {
            postRollOptions.push(`check:total:delta:${roll.total - context.dc.value}`);
        }

        // Combine all degree of success adjustments into a single record. Some may be overridden, but that should be
        // rare--and there are no rules for selecting among multiple adjustments.
        const dosAdjustments = ((): DegreeAdjustmentsRecord => {
            if (!context.dc) return {};

            // Include tentative results in case an adjustment is predicated on it
            const temporaryRollOptions = new Set([...postRollOptions, ...rollOptions]);

            return (
                context.dosAdjustments
                    ?.filter((a) => a.predicate?.test(temporaryRollOptions) ?? true)
                    .reduce((record, data) => {
                        for (const outcome of ["all", ...DEGREE_OF_SUCCESS_STRINGS] as const) {
                            if (data.adjustments[outcome]) {
                                record[outcome] = fu.deepClone(data.adjustments[outcome]);
                            }
                        }
                        return record;
                    }, {} as DegreeAdjustmentsRecord) ?? {}
            );
        })();
        const degree = context.dc ? new DegreeOfSuccess(roll, context.dc, dosAdjustments) : null;

        if (degree) {
            context.outcome = DEGREE_OF_SUCCESS_STRINGS[degree.value];
            context.unadjustedOutcome = DEGREE_OF_SUCCESS_STRINGS[degree.unadjusted];
            roll.options.degreeOfSuccess = degree.value;
        }

        const notes =
            context.notes
                ?.map((n) => (n instanceof RollNotePF2e ? n : new RollNotePF2e(n)))
                .filter((note) => {
                    if (
                        !note.predicate.test([
                            ...rollOptions,
                            ...postRollOptions,
                            ...(note.rule?.item.getRollOptions("parent") ?? []),
                        ])
                    ) {
                        return false;
                    }
                    if (!context.dc || note.outcome.length === 0) {
                        // Always show the note if the check has no DC or no outcome is specified.
                        return true;
                    }
                    const outcome = context.outcome ?? context.unadjustedOutcome;
                    return !!(outcome && note.outcome.includes(outcome));
                }) ?? [];
        const notesList = RollNotePF2e.notesToHTML(notes);

        const item = context.item ?? null;

        const targeting = !!context.origin?.self;
        const self = targeting ? (context.origin ?? null) : (context.target ?? null);
        const opposer = targeting ? (context.target ?? null) : (context.origin ?? null);

        const flavor = await (async (): Promise<string> => {
            const result = await this.#createResultFlavor({ degree, self, opposer, targeting });
            const tags = this.#createTagFlavor({ check, context, extraTags });
            const title = (context.title ?? check.slug).trim();
            const header = title.startsWith("<h4")
                ? title
                : ((): HTMLElement => {
                      const strong = document.createElement("strong");
                      strong.innerHTML = title;
                      return createHTMLElement("h4", { classes: ["action"], children: [strong] });
                  })();

            return [header, result, tags, notesList]
                .flat()
                .filter(R.isTruthy)
                .map((e) => (typeof e === "string" ? e : e.outerHTML))
                .join("");
        })();

        const contextFlag: CheckContextChatFlag = {
            ...context,
            type: context.type ?? "check",
            identifier: context.identifier ?? null,
            item: undefined,
            dosAdjustments,
            actor: context.actor?.id ?? null,
            token: context.token?.id ?? null,
            domains: context.domains ?? [],
            origin: context.origin?.actor
                ? { actor: context.origin.actor.uuid, token: context.origin.token?.uuid }
                : null,
            target: context.target?.actor
                ? { actor: context.target.actor.uuid, token: context.target.token?.uuid }
                : null,
            options: Array.from(rollOptions).sort(),
            contextualOptions: {
                postRoll: postRollOptions,
            },
            notes: notes.map((n) => n.toObject()),
            rollMode: context.rollMode,
            rollTwice: context.rollTwice ?? false,
            title: context.title ?? "PF2E.Check.Label",
            traits: context.traits ?? [],
            substitutions,
            dc: context.dc ? R.omit(context.dc, ["statistic"]) : null,
            skipDialog: context.skipDialog,
            isReroll: context.isReroll ?? false,
            outcome: context.outcome ?? null,
            unadjustedOutcome: context.unadjustedOutcome ?? null,
        };
        delete contextFlag.item;

        type MessagePromise = Promise<ChatMessagePF2e | ChatMessageSourcePF2e>;
        const message = await ((): MessagePromise => {
            const flags = {
                core: context.type === "initiative" ? { initiativeRoll: true } : {},
                pf2e: {
                    context: contextFlag,
                    modifierName: check.slug,
                    modifiers: check.modifiers.map((m) => m.toObject()),
                    origin: item?.getOriginData(),
                },
            };

            const speaker = ChatMessagePF2e.getSpeaker({ actor: context.actor, token: context.token });
            const rollMode = contextFlag.rollMode;
            const create = context.createMessage;

            return roll.toMessage({ speaker, flavor, flags }, { rollMode, create }) as MessagePromise;
        })();

        if (callback) {
            const msg = message instanceof ChatMessagePF2e ? message : new ChatMessagePF2e(message);
            await callback(roll, context.outcome, msg, event);
        }

        // Consume one unit of the weapon if it has the consumable trait
        const isConsumableWeapon = item?.isOfType("weapon") && item.traits.has("consumable");
        if (isConsumableWeapon && item.actor.items.has(item.id) && item.quantity > 0) {
            await item.update({ system: { quantity: item.quantity - 1 } });
        }

        return roll;
    }

    static #createTagFlavor({ check, context, extraTags }: CreateTagFlavorParams): HTMLElement[] {
        const toTagElement = (tag: TraitViewData, cssClass: string | null = null): HTMLElement => {
            const span = document.createElement("span");
            span.classList.add("tag");
            if (cssClass) span.classList.add(`tag_${cssClass}`);

            span.innerText = tag.label;

            if (tag.name) span.dataset.slug = tag.name;
            if (tag.description) span.dataset.tooltip = tag.description;

            return span;
        };

        const traits =
            R.uniqueBy(
                context.traits
                    ?.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits))
                    .map((trait) => {
                        trait.label = game.i18n.localize(trait.label);
                        return trait;
                    }) ?? [],
                (t) => t.name,
            )
                .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
                .map((t) => toTagElement(t)) ?? [];

        const item = context.item;
        const itemTraits =
            item?.isOfType("weapon", "melee") && context.type !== "saving-throw"
                ? Array.from(item.traits)
                      .map((t): TraitViewData => {
                          const dictionary = item.isOfType("spell")
                              ? CONFIG.PF2E.spellTraits
                              : CONFIG.PF2E.npcAttackTraits;
                          const obj = traitSlugToObject(t, dictionary);
                          obj.label = game.i18n.localize(obj.label);
                          return obj;
                      })
                      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
                      .map((t): HTMLElement => toTagElement(t, "alt"))
                : [];

        const properties = ((): HTMLElement[] => {
            const range = item?.isOfType("action", "weapon") ? item.range : null;
            const label = createActionRangeLabel(range);
            if (label && (range?.increment || range?.max)) {
                // Show the range increment or max range as a tag
                const slug = range.increment ? `range-increment-${range.increment}` : `range-${range.max}`;
                const description = "PF2E.Item.Weapon.RangeIncrementN.Hint";
                return [toTagElement({ name: slug, label, description }, "secondary")];
            } else {
                return [];
            }
        })();

        const traitsAndProperties = createHTMLElement("div", {
            classes: ["tags", "traits"],
            dataset: { tooltipClass: "pf2e" },
        });
        if (itemTraits.length === 0 && properties.length === 0) {
            traitsAndProperties.append(...traits);
        } else {
            const verticalBar = document.createElement("hr");
            verticalBar.className = "vr";
            traitsAndProperties.append(...[traits, verticalBar, itemTraits, properties].flat());
        }

        const showBreakdown = game.pf2e.settings.metagame.breakdowns || !!context.actor?.hasPlayerOwner;
        const modifiers = check.modifiers
            .filter((m) => m.enabled)
            .map((modifier) => {
                const sign = modifier.modifier < 0 ? "" : "+";
                const label = `${modifier.label} ${sign}${modifier.modifier}`;
                const tag = toTagElement({ name: modifier.slug, label, description: null }, "transparent");
                if (!showBreakdown) tag.dataset.visibility = "gm";
                return tag;
            });
        const tagsFromOptions = extraTags.map((t) => {
            const label = game.i18n.localize(t);
            const slug = sluggify(label);
            return toTagElement({ name: slug, label, description: null }, "transparent");
        });
        const rollTags = [...modifiers, ...tagsFromOptions];
        const modifiersAndExtras =
            rollTags.length > 0
                ? createHTMLElement("div", { classes: ["tags", "modifiers"], children: rollTags })
                : null;

        return [
            traitsAndProperties.childElementCount > 0 ? traitsAndProperties : null,
            document.createElement("hr"),
            modifiersAndExtras,
        ].filter(R.isTruthy);
    }

    /** Reroll a rolled check given a chat message. */
    static async rerollFromMessage(message: ChatMessagePF2e, options: RerollOptions = {}): Promise<void> {
        if (!(message.isAuthor || game.user.isGM)) {
            ui.notifications.error(game.i18n.localize("PF2E.RerollMenu.ErrorCantDelete"));
            return;
        }

        const actor = message.actor;
        if (!actor) {
            ui.notifications.error("PF2E.RerollMenu.ErrorNoActor", { localize: true });
            return;
        }

        const rerollingActor = actor.isOfType("familiar") ? actor.master : actor;
        const resourceKey = options.resource;
        const resource = rerollingActor?.getResource(resourceKey ?? "");

        if (resource && resource.slug !== "hero-points" && resource.slug !== "mythic-points") {
            console.warn(`${resource.label} is not a supported resource. Using it might lead to unexpected results.`);
        }

        let rerollFlavor = game.i18n.localize(`PF2E.RerollMenu.MessageKeep.${options.keep}`);
        if (resource) {
            // If the reroll costs a hero or mythic point, first check if the actor has one to spare and spend it
            if (rerollingActor?.isOfType("character")) {
                if (resource && resource.value > 0) {
                    await rerollingActor.updateResource(resource.slug, resource.value - 1);
                    rerollFlavor = game.i18n.localize(
                        `PF2E.RerollMenu.Message${sluggify(resource.slug, { camel: "bactrian" })}`,
                    );
                } else {
                    ui.notifications.warn("PF2E.RerollMenu.WarnNoResource", {
                        localize: true,
                        format: {
                            name: rerollingActor.name,
                            resource: resource.label,
                        },
                    });
                    return;
                }
            }
        }

        const systemFlags = fu.deepClone(message.flags.pf2e);
        const context = systemFlags.context;
        if (!isCheckContextFlag(context)) return;

        context.skipDialog = true;
        context.isReroll = true;
        context.options.push("check:reroll");
        if (resource) context.options.push(`check:reroll:${resource.slug}`);

        const oldRoll = message.rolls.at(0);
        if (!(oldRoll instanceof CheckRoll)) throw ErrorPF2e("Unexpected error retrieving prior roll");
        const oldRollJSON = JSON.stringify(oldRoll.toJSON());
        const pwolVariant = game.pf2e.settings.variants.pwol.enabled;

        // Clone the old roll and call a hook allowing the clone to be altered.
        // Tampering with the old roll is disallowed.
        const unevaluatedNewRoll = ((): CheckRoll => {
            if (resource?.slug !== "mythic-points" || !actor.isOfType("character")) return oldRoll.clone();
            // Create a new CheckRoll in case of a mythic point reroll
            const proficiencyModifier = (systemFlags.modifiers ?? []).find((m) => m.slug === "proficiency");
            if (!proficiencyModifier) {
                throw ErrorPF2e(`Failed to reroll check with a mythic point. Check is missing a proficiency modifier!`);
            }
            // Set flag proficiency modifier to mythic modifier value
            const mythicModifierValue = 10 + (pwolVariant ? 0 : actor.level);
            const proficiencyModifierValue = proficiencyModifier.modifier;
            proficiencyModifier.modifier = mythicModifierValue;
            proficiencyModifier.label = game.i18n.localize("PF2E.TraitMythic");
            // Calculate the new total modifier
            const options = fu.deepClone(oldRoll.options);
            options.totalModifier = (options.totalModifier ?? 0) - proficiencyModifierValue + mythicModifierValue;
            return new CheckRoll(
                `${options.dice}${signedInteger(options.totalModifier, { emptyStringZero: true })}`,
                oldRoll.data,
                options,
            );
        })();
        unevaluatedNewRoll.options.isReroll = true;
        Hooks.callAll("pf2e.preReroll", Roll.fromJSON(oldRollJSON), unevaluatedNewRoll, resource, options.keep);

        // Evaluate the new roll and call a second hook allowing the roll to be altered
        const allowInteractive = context.rollMode !== "blindroll";
        const newRoll = await unevaluatedNewRoll.evaluate({ allowInteractive });
        Hooks.callAll("pf2e.reroll", Roll.fromJSON(oldRollJSON), newRoll, resource, options.keep);

        // Keep the new roll by default; Old roll is discarded
        let keptRoll = newRoll;
        let [oldRollClass, newRollClass] = ["reroll-discard", ""];

        // Check if we should keep the old roll instead.
        if (
            (options.keep === "higher" && oldRoll.total > newRoll.total) ||
            (options.keep === "lower" && oldRoll.total < newRoll.total)
        ) {
            // If so, switch the css classes and keep the old roll.
            [oldRollClass, newRollClass] = [newRollClass, oldRollClass];
            keptRoll = oldRoll;
        }

        const degree = ((): DegreeOfSuccess | null => {
            const dc = context.dc as Maybe<CheckDC>;
            if (!dc) return null;
            if (["ac", "armor"].includes(dc.slug ?? "")) {
                const targetActor = ((): ActorPF2e | null => {
                    const target = context.target;
                    if (!target?.actor) return null;

                    const maybeActor = fromUuidSync(target.actor);
                    return maybeActor instanceof ActorPF2e
                        ? maybeActor
                        : maybeActor instanceof TokenDocumentPF2e
                          ? maybeActor.actor
                          : null;
                })();
                dc.statistic = targetActor?.armorClass;
            }
            return new DegreeOfSuccess(newRoll, dc, context.dosAdjustments);
        })();
        const useNewRoll = keptRoll === newRoll;

        if (useNewRoll && degree) {
            newRoll.options.degreeOfSuccess = degree.value;
            context.outcome = DEGREE_OF_SUCCESS_STRINGS[degree.value];
        }

        const renders = {
            old: await Check.renderReroll(oldRoll, { isOld: true, resource }),
            new: await Check.renderReroll(newRoll, { isOld: false, resource }),
        };

        const rerollIcon = fontAwesomeIcon(
            resource?.slug === "hero-points"
                ? "hospital-symbol"
                : resource?.slug === "mythic-points"
                  ? "circle-m"
                  : "dice",
        );
        rerollIcon.classList.add("reroll-indicator");
        rerollIcon.dataset.tooltip = rerollFlavor;

        const oldFlavor = message.flavor ?? "";
        const newFlavor = useNewRoll
            ? await (async (): Promise<string> => {
                  const parsedFlavor = document.createElement("div");
                  parsedFlavor.innerHTML = oldFlavor;
                  const targeting = actor.uuid === context.origin?.actor;
                  const self = targeting ? context.origin : context.target;
                  const opposer = context.target?.actor === actor.uuid ? context.origin : context.target;
                  const targetFlavor = await this.#createResultFlavor({ degree, self, opposer, targeting });
                  if (targetFlavor) {
                      htmlQuery(parsedFlavor, ".target-dc-result")?.replaceWith(targetFlavor);
                  }

                  // Add mythic proficiency tag
                  if (resource?.slug === "mythic-points") {
                      const proficiencyTag = htmlQuery(parsedFlavor, "span[data-slug=proficiency]");
                      if (proficiencyTag) {
                          const mythicTag = proficiencyTag.cloneNode() as HTMLElement;
                          proficiencyTag.style.textDecorationLine = "line-through";
                          const mythicValue = signedInteger(10 + (pwolVariant ? 0 : actor.level), {
                              emptyStringZero: true,
                          });
                          mythicTag.innerHTML = `${game.i18n.localize("PF2E.TraitMythic")} ${mythicValue}`;
                          proficiencyTag.after(mythicTag);
                      }
                  }

                  htmlQuery(parsedFlavor, "ul.notes")?.remove();
                  const newNotes = context.notes?.map((n) => new RollNotePF2e(n)) ?? [];
                  const notesEl = RollNotePF2e.notesToHTML(
                      newNotes.filter((note) => {
                          if (!context.dc || note.outcome.length === 0) {
                              // Always show the note if the check has no DC or no outcome is specified.
                              return true;
                          }
                          const outcome = context.outcome ?? context.unadjustedOutcome;
                          return !!(outcome && note.outcome.includes(outcome));
                      }),
                  );
                  if (notesEl) parsedFlavor.append(notesEl);

                  return parsedFlavor.innerHTML;
              })()
            : oldFlavor;

        // If this was an initiative roll, apply the result to the current encounter
        const initiativeRoll = message.flags.core.initiativeRoll;
        if (initiativeRoll) {
            const combatant = message.token?.combatant;
            await combatant?.parent.setInitiative(combatant.id, newRoll.total);
        }

        await message.delete({ render: false });
        const keptMessage = (await keptRoll.toMessage(
            {
                content: `<div class="${oldRollClass}">${renders.old}</div><div class="reroll-second ${newRollClass}">${renders.new}</div>`,
                flavor: `${rerollIcon.outerHTML}${newFlavor}`,
                speaker: message.speaker,
                flags: {
                    core: { initiativeRoll },
                    pf2e: systemFlags,
                },
            },
            { rollMode: context.rollMode },
        )) as ChatMessagePF2e;

        if (systemFlags.treatWoundsMacroFlag) {
            treatWoundsMacroCallback({
                actor,
                bonus: systemFlags.treatWoundsMacroFlag.bonus,
                message: keptMessage,
                originalMessageId: message.id,
                outcome: context.outcome,
            });
        }
    }

    /**
     * Renders the reroll, highlighting the old result if it was a critical success or failure
     * @param roll  The roll that is to be rerendered
     * @param isOld This is the old roll render, so remove damage or other buttons
     */
    static async renderReroll(
        roll: Rolled<Roll>,
        { isOld, resource }: { isOld: boolean; resource?: ResourceData | null },
    ): Promise<string> {
        const die = roll.dice.find((d): d is Die => d instanceof foundry.dice.terms.Die && d.faces === 20);
        if (typeof die?.total !== "number") throw ErrorPF2e("Unexpected error inspecting d20 term");

        const html = await roll.render();
        const element = parseHTML(`<div>${html}</div>`);

        // Handle roll formula visibility
        const formulaElement = htmlQuery(element, ".dice-formula");
        if (formulaElement && !isOld && resource?.slug !== "mythic-points") {
            // Hide rerolled formula for everything except mythic point rerolls
            formulaElement.classList.add("hidden");
        } else if (formulaElement && isOld && resource?.slug === "mythic-points") {
            // Fade out the old formula element for mythic point rerolls
            formulaElement.style.opacity = "0.3";
        }

        // Remove the buttons if this is the discarded roll
        if (isOld) element.querySelector(".message-buttons")?.remove();

        if (![1, 20].includes(die.total)) return element.innerHTML;

        element.querySelector(".dice-total")?.classList.add(die.total === 20 ? "success" : "failure");

        return element.innerHTML;
    }

    static async #createResultFlavor({
        degree,
        self,
        opposer,
        targeting,
    }: CreateResultFlavorParams): Promise<HTMLElement | null> {
        if (!degree || !self?.actor) return null;

        const dc = degree.dc;
        const needsDCParam = !!dc.label && Number.isInteger(dc.value) && !dc.label.includes("{dc}");
        const customLabel =
            needsDCParam && dc.label ? `<dc>${game.i18n.localize(dc.label)}: {dc}</dc>` : (dc.label ?? null);

        const opposingActor = await (async (): Promise<ActorPF2e | null> => {
            if (!opposer?.actor) return null;
            if (opposer.actor instanceof ActorPF2e) return opposer.actor;

            // This is a context flag: get the actor via UUID
            const maybeActor = await fromUuid(opposer.actor);
            return maybeActor instanceof ActorPF2e
                ? maybeActor
                : maybeActor instanceof TokenDocumentPF2e
                  ? maybeActor.actor
                  : null;
        })();

        // Not actually included in the template, but used for creating other template data
        const opposerData = await (async (): Promise<{ name: string; visible: boolean } | null> => {
            if (!opposer) return null;

            const token = await (async (): Promise<TokenDocumentPF2e | null> => {
                if (!opposer.token) return null;
                if (opposer.token instanceof TokenDocumentPF2e) return opposer.token;
                if (opposingActor?.token) return opposingActor.token;

                // This is from a context flag: get the actor via UUID
                return fromUuid(opposer.token) as Promise<TokenDocumentPF2e<ScenePF2e> | null>;
            })();

            const canSeeTokenName = (token ?? new TokenDocumentPF2e(opposingActor?.prototypeToken.toObject() ?? {}))
                .playersCanSeeName;
            const canSeeName = canSeeTokenName || !game.pf2e.settings.tokens.nameVisibility;

            return {
                name: token?.name ?? opposingActor?.name ?? "",
                visible: !!canSeeName,
            };
        })();

        const checkDCs = CONFIG.PF2E.checkDCs;

        // DC, circumstance adjustments, and the target's name
        const dcData = ((): ResultFlavorTemplateData["dc"] => {
            const dcSlug = ((): string | null => {
                const fromParams =
                    dc.slug ?? (dc.statistic instanceof StatisticDifficultyClass ? dc.statistic.parent.slug : null);
                return fromParams === "ac" ? "armor" : (fromParams?.replace(/-dc$/, "") ?? null);
            })();
            const dcType = game.i18n.localize(
                dc.label?.trim() ||
                    game.i18n.localize(
                        objectHasKey(checkDCs.Specific, dcSlug) ? checkDCs.Specific[dcSlug] : checkDCs.Unspecific,
                    ),
            );

            // Get any circumstance penalties or bonuses to the target's DC
            const circumstances =
                dc.statistic instanceof StatisticDifficultyClass
                    ? dc.statistic.modifiers.filter((m) => m.enabled && m.type === "circumstance")
                    : [];
            const preadjustedDC =
                circumstances.length > 0 && dc.statistic
                    ? dc.value - circumstances.reduce((total, c) => total + c.modifier, 0)
                    : (dc.value ?? null);

            const visible = opposingActor?.hasPlayerOwner || dc.visible || game.pf2e.settings.metagame.dcs;

            if (typeof preadjustedDC !== "number" || circumstances.length === 0) {
                const labelKey = game.i18n.localize(
                    opposerData
                        ? targeting
                            ? checkDCs.Label.WithTarget
                            : checkDCs.Label.WithOrigin
                        : (customLabel ?? checkDCs.Label.NoTarget),
                );
                const markup = game.i18n.format(labelKey, { dcType, dc: dc.value, opposer: opposerData?.name ?? null });

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
                adjustment.direction === "no-change" ? checkDCs.Label.NoChangeTarget : checkDCs.Label.AdjustedTarget;

            const markup = game.i18n.format(translation, {
                opposer: opposerData?.name ?? game.user.name,
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
            const visible = game.pf2e.settings.metagame.results;

            return { markup, visible };
        })();

        // Render the template and replace quasi-XML nodes with visibility-data-containing HTML elements
        const rendered = await fa.handlebars.renderTemplate(
            `${SYSTEM_ROOT}/templates/chat/check/target-dc-result.hbs`,
            {
                dc: dcData,
                result: resultData,
            },
        );

        const html = parseHTML(rendered);
        const convertXMLNode = TextEditorPF2e.convertXMLNode;

        if (opposerData) {
            convertXMLNode(html, "opposer", { visible: opposerData.visible, whose: "opposer" });
        }
        convertXMLNode(html, "dc", { visible: dcData.visible, whose: "opposer" });
        const adjustment = dcData.adjustment;
        if (adjustment) {
            convertXMLNode(html, "preadjusted", { classes: ["unadjusted"] });

            // Add circumstance bonuses/penalties for tooltip content
            const adjustedNode = convertXMLNode(html, "adjusted", {
                classes: ["adjusted", adjustment.direction],
            });
            if (!adjustedNode) throw ErrorPF2e("Unexpected error processing roll template");

            if (adjustment.circumstances.length > 0) {
                adjustedNode.dataset.tooltip = adjustment.circumstances
                    .map(
                        (a: { label: string; value: number }) =>
                            createHTMLElement("div", { children: [`${a.label}: ${signedInteger(a.value)}`] }).outerHTML,
                    )
                    .join("\n");
            }
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
            adjustedNode.dataset.tooltip = degree.adjustment.label;
        }

        convertXMLNode(html, "offset", { visible: dcData.visible, whose: "opposer" });

        // If target and DC are both hidden from view, hide both
        if (!opposerData?.visible && !dcData.visible) {
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
    self: RollOrigin | RollTarget | ActorTokenFlag | null;
    opposer?: RollOrigin | RollTarget | ActorTokenFlag | null;
    /** Whether `self` is targeting the `opposer` (or otherwise being targeted by it) */
    targeting: boolean;
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
    context: CheckCheckContext;
    extraTags: string[];
}

export { Check };
export type { CheckRollCallback };
