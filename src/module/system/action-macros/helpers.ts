import type { ActorPF2e } from "@actor";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression.ts";
import type { StrikeData } from "@actor/data/base.ts";
import { getRangeIncrement } from "@actor/helpers.ts";
import { CheckModifier, Modifier, ensureProficiencyOption } from "@actor/modifiers.ts";
import type { RollOrigin, RollTarget } from "@actor/roll-context/types.ts";
import type { ItemPF2e, WeaponPF2e } from "@item";
import type { AbilityTrait } from "@item/ability/types.ts";
import type { WeaponTrait } from "@item/weapon/types.ts";
import { RollNotePF2e } from "@module/notes.ts";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractRollSubstitutions,
} from "@module/rules/helpers.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import type { TokenDocumentPF2e } from "@scene";
import { Check, CheckType } from "@system/check/index.ts";
import type { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { CheckDCReference, Statistic } from "@system/statistic/index.ts";
import { sluggify } from "@util";
import { getSelectedActors } from "@util/token-actor-utils.ts";
import * as R from "remeda";
import type {
    CheckContextData,
    CheckContextOptions,
    CheckMacroContext,
    SimpleRollActionCheckOptions,
    UnresolvedCheckDC,
} from "./types.ts";

class ActionMacroHelpers {
    static resolveStat(
        stat: string,
        actor: ActorPF2e,
    ): {
        checkType: CheckType;
        property: string;
        stat: string;
        subtitle: string;
    } {
        switch (stat) {
            case "perception":
                return {
                    checkType: "perception-check",
                    property: "perception",
                    stat,
                    subtitle: "PF2E.ActionsCheck.perception",
                };
            case "unarmed":
                return {
                    checkType: "attack-roll",
                    property: "unarmed",
                    stat,
                    subtitle: "PF2E.ActionsCheck.unarmed",
                };
            default: {
                const slug = sluggify(stat);
                const property = `skills.${slug}`;
                const subtitle = `PF2E.ActionsCheck.${stat}`;
                return {
                    checkType: "skill-check",
                    property,
                    stat,
                    subtitle: game.i18n.has(subtitle)
                        ? subtitle
                        : game.i18n.format("PF2E.ActionsCheck.x", { type: actor.skills?.[stat]?.label ?? null }),
                };
            }
        }
    }

    static defaultCheckContext<ItemType extends ItemPF2e<ActorPF2e>>(
        options: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>,
    ): CheckMacroContext<ItemType> | undefined {
        const { checkType: type, property, stat: slug, subtitle } = this.resolveStat(data.slug, options.actor);
        const statistic =
            options.actor.getStatistic(data.slug) ?? (fu.getProperty(options.actor, property) as StrikeData);
        if (!statistic) {
            const { actor } = options;
            const message = `Actor ${actor.name} (${actor.id}) does not have a statistic for ${slug}.`;
            throw new CheckContextError(message, actor, slug);
        }
        const { item, rollOptions: contextualRollOptions } = options.buildContext({
            actor: options.actor,
            item: data.item,
            rollOptions: [...data.rollOptions],
            target: options.target,
        });

        // add relevant modifier adjustments
        const modifiers = (data.modifiers ?? [])
            .map((modifier) => modifier.clone())
            .map((modifier) => {
                const adjustments = extractModifierAdjustments(
                    options.actor.synthetics.modifierAdjustments,
                    [type, slug],
                    modifier.slug,
                );
                modifier.adjustments = (modifier.adjustments ?? []).concat(adjustments);
                return modifier;
            });

        return {
            item,
            modifiers,
            rollOptions: contextualRollOptions,
            slug,
            statistic,
            subtitle,
            type,
        };
    }

    static note(
        selector: string,
        translationPrefix: string,
        outcome: DegreeOfSuccessString,
        translationKey?: string,
    ): RollNotePF2e {
        const visible = game.pf2e.settings.metagame.results;
        const outcomes = visible ? [outcome] : [];
        return new RollNotePF2e({
            selector,
            text: game.i18n.localize(translationKey ?? `${translationPrefix}.Notes.${outcome}`),
            outcome: outcomes,
        });
    }

    static outcomesNote(selector: string, translationKey: string, outcomes: DegreeOfSuccessString[]): RollNotePF2e {
        const visible = game.pf2e.settings.metagame.results;
        const visibleOutcomes = visible ? outcomes : [];
        return new RollNotePF2e({
            selector: selector,
            text: game.i18n.localize(translationKey),
            outcome: visibleOutcomes,
        });
    }

    static async simpleRollActionCheck<TItem extends ItemPF2e<ActorPF2e>>(
        options: SimpleRollActionCheckOptions<TItem>,
    ): Promise<void> {
        // figure out actors to roll for
        const rollers: ActorPF2e[] = [];
        if (Array.isArray(options.actors)) {
            rollers.push(...options.actors);
        } else if (options.actors) {
            rollers.push(options.actors);
        } else {
            rollers.push(...getSelectedActors({ exclude: ["loot", "party"], assignedFallback: true }));
        }

        if (rollers.length === 0) {
            throw new Error(game.i18n.localize("PF2E.ActionsWarning.NoActor"));
        }

        const targetData = options.target?.() ?? this.target();

        for (const actor of rollers) {
            try {
                const selfToken = actor.getActiveTokens(false, true).shift() ?? null;
                const {
                    item: weapon,
                    modifiers = [],
                    rollOptions: combinedOptions,
                    statistic,
                    subtitle,
                    type,
                } = await options.checkContext({
                    actor,
                    buildContext: (args) => {
                        const combinedOptions = [args.rollOptions, options.traits].flat().filter(R.isTruthy);
                        combinedOptions.push(...(args.item?.getRollOptions("item") ?? []));
                        return { item: args.item, rollOptions: combinedOptions.sort(), target: args.target };
                    },
                    target: targetData.actor,
                })!;

                const header = await fa.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
                    glyph: options.actionGlyph,
                    subtitle,
                    title: options.title,
                });

                const actionTraits = (options.traits ?? []).filter(
                    (t): t is AbilityTrait => t in CONFIG.PF2E.actionTraits,
                );
                const notes = options.extraNotes?.(statistic.slug) ?? [];
                const label = (await options.content?.(header)) ?? header;

                if (statistic instanceof Statistic) {
                    const dc = this.#resolveCheckDC({ unresolvedDC: options.difficultyClass });
                    await statistic.roll({
                        ...eventToRollParams(options.event, { type: "check" }),
                        token: selfToken,
                        label,
                        title: label,
                        dc,
                        extraRollNotes: notes,
                        extraRollOptions: combinedOptions,
                        modifiers,
                        target: targetData.actor,
                        traits: actionTraits,
                        createMessage: options.createMessage,
                        callback: (roll, outcome, message) => {
                            options.callback?.({ actor, message, outcome, roll });
                        },
                    });
                } else {
                    const check = new CheckModifier(label, statistic, modifiers);
                    const dc = this.#resolveCheckDC({
                        target: targetData.actor,
                        unresolvedDC: options.difficultyClass,
                        fully: true,
                    });
                    const finalOptions = new Set(combinedOptions);
                    ensureProficiencyOption(finalOptions, statistic.rank ?? -1);
                    check.calculateTotal(finalOptions);
                    const selfActor = actor.getContextualClone(combinedOptions.filter((o) => o.startsWith("self:")));

                    const distance = ((): number | null => {
                        const reach =
                            selfActor.isOfType("creature") && weapon?.isOfType("weapon")
                                ? (selfActor.getReach({ action: "attack", weapon }) ?? null)
                                : null;
                        return selfToken?.object && targetData?.token?.object
                            ? selfToken.object.distanceTo(targetData.token.object, { reach })
                            : null;
                    })();
                    const rangeIncrement =
                        weapon?.isOfType("weapon") && typeof distance === "number"
                            ? getRangeIncrement(weapon, distance)
                            : null;
                    const domains = ["all", type, statistic.slug];
                    const rollOrigin: RollOrigin = {
                        actor: selfActor,
                        token: selfToken,
                        item: weapon ?? null,
                        self: true,
                        statistic,
                        modifiers: [],
                    };
                    const rollTarget: RollTarget | null =
                        targetData.token && targetData.actor && typeof distance === "number"
                            ? {
                                  actor: targetData.actor,
                                  token: targetData.token,
                                  statistic: null,
                                  self: false,
                                  item: null,
                                  distance,
                                  rangeIncrement,
                              }
                            : null;
                    const substitutions = extractRollSubstitutions(
                        actor.synthetics.rollSubstitutions,
                        domains,
                        finalOptions,
                    );
                    const dosAdjustments = extractDegreeOfSuccessAdjustments(actor.synthetics, domains);

                    await Check.roll(
                        check,
                        {
                            actor: selfActor,
                            token: selfToken,
                            item: weapon,
                            createMessage: options.createMessage,
                            origin: rollOrigin,
                            target: rollTarget,
                            dc,
                            type,
                            options: finalOptions,
                            notes: [...notes, ...(statistic.notes ?? [])],
                            dosAdjustments,
                            substitutions,
                            traits: actionTraits,
                            title: label,
                        },
                        options.event,
                        (roll, outcome, message) => {
                            options.callback?.({ actor, message, outcome, roll });
                        },
                    );
                }
            } catch (cce) {
                if (cce instanceof CheckContextError) {
                    const message = game.i18n.format("PF2E.ActionsWarning.NoStatistic", {
                        id: cce.actor.id,
                        name: cce.actor.name,
                        statistic: cce.slug,
                    });
                    ui.notifications.error(message);
                    continue;
                }
                throw cce;
            }
        }
    }

    static target(): {
        token: TokenDocumentPF2e | null;
        actor: ActorPF2e | null;
    } {
        const targets = Array.from(game.user.targets).filter((t) => t.actor?.isOfType("creature"));
        const target = targets.shift()?.document ?? null;
        const targetActor = target?.actor ?? null;
        return {
            token: target,
            actor: targetActor,
        };
    }

    static getWeaponPotencyModifier(item: WeaponPF2e<ActorPF2e>, selector: string): Modifier | null {
        const slug = "potency";
        if (AutomaticBonusProgression.isEnabled(item.actor)) {
            return new Modifier({
                slug,
                type: "potency",
                label: "PF2E.AutomaticBonusProgression.attackPotency",
                modifier: item.actor.synthetics.weaponPotency["strike-attack-roll"]?.[0]?.bonus ?? 0,
                adjustments: extractModifierAdjustments(item.actor.synthetics.modifierAdjustments, [selector], slug),
            });
        } else if (item.system.runes.potency > 0) {
            return new Modifier({
                slug,
                type: "item",
                label: "PF2E.Item.Weapon.Rune.Potency",
                modifier: item.system.runes.potency,
                adjustments: extractModifierAdjustments(item.actor.synthetics.modifierAdjustments, [selector], slug),
            });
        } else {
            return null;
        }
    }

    static #getApplicableEquippedWeapons(actor: ActorPF2e, trait: WeaponTrait): WeaponPF2e<ActorPF2e>[] {
        if (actor.isOfType("character")) {
            return actor.system.actions.flatMap((s) => (s.ready && s.item.traits.has(trait) ? s.item : []));
        } else {
            return actor.itemTypes.weapon.filter((w) => w.isEquipped && w.traits.has(trait));
        }
    }

    static getBestEquippedItemForAction(
        actor: ActorPF2e,
        traits: WeaponTrait[],
        selector: string,
    ): WeaponPF2e<ActorPF2e> | null {
        const items = traits.flatMap((t) => ActionMacroHelpers.#getApplicableEquippedWeapons(actor, t));
        if (items.length === 0) return null;

        const bestItem = items.reduce(
            (max, item) =>
                (ActionMacroHelpers.getWeaponPotencyModifier(item, selector)?.value ?? 0) >
                (ActionMacroHelpers.getWeaponPotencyModifier(max, selector)?.value ?? 0)
                    ? item
                    : max,
            items[0],
        );
        return bestItem ?? null;
    }

    /** Attempts to get the label for the given statistic using a slug */
    static getSimpleCheckLabel(slug: string): string | null {
        switch (slug) {
            case "flat":
                return game.i18n.localize("PF2E.FlatCheck");
            case "perception":
                return game.i18n.localize("PF2E.PerceptionLabel");
            case "unarmed":
                return game.i18n.localize("PF2E.TraitUnarmed");
            case "lore":
                return game.i18n.localize("PF2E.SkillLore");
            default: {
                const saves: Record<string, string> = CONFIG.PF2E.saves;
                const skills: Record<string, { label: string }> = CONFIG.PF2E.skills;
                const label = saves[slug] ?? skills[slug]?.label;
                return label ? game.i18n.localize(label) : null;
            }
        }
    }

    /** A DC can be fully resolved, retrieving the `Statistic` if provided a reference */
    static #resolveCheckDC(params: ResolveCheckDCParams & { fully: true }): CheckDC | null;
    static #resolveCheckDC(params: ResolveCheckDCParams): CheckDC | CheckDCReference | null;
    static #resolveCheckDC({
        unresolvedDC = null,
        target = null,
        fully = false,
    }: ResolveCheckDCParams): CheckDC | CheckDCReference | null {
        if (typeof unresolvedDC === "string") {
            return fully ? (target?.getStatistic(unresolvedDC)?.dc ?? null) : { slug: unresolvedDC };
        }
        if (typeof unresolvedDC === "function") return unresolvedDC(target);

        return unresolvedDC;
    }
}

class CheckContextError extends Error {
    constructor(
        message: string,
        public actor: ActorPF2e,
        public slug: string,
    ) {
        super(message);
    }
}

interface ResolveCheckDCParams {
    unresolvedDC: UnresolvedCheckDC | undefined | null;
    target?: ActorPF2e | null;
    fully?: boolean;
}

export { ActionMacroHelpers, CheckContextError };
