import { ActorPF2e, CreaturePF2e } from "@actor";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression.ts";
import { getRangeIncrement } from "@actor/helpers.ts";
import { CheckModifier, ModifierPF2e, StatisticModifier, ensureProficiencyOption } from "@actor/modifiers.ts";
import { DC_SLUGS } from "@actor/values.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import { WeaponTrait } from "@item/weapon/types.ts";
import { RollNotePF2e } from "@module/notes.ts";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractRollSubstitutions,
} from "@module/rules/helpers.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckPF2e, CheckType } from "@system/check/index.ts";
import { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { Statistic } from "@system/statistic/index.ts";
import { setHasElement, sluggify } from "@util";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";
import {
    CheckContext,
    CheckContextData,
    CheckContextError,
    CheckContextOptions,
    SimpleRollActionCheckOptions,
} from "./types.ts";

export class ActionMacroHelpers {
    static resolveStat(stat: string): {
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
                return {
                    checkType: "skill-check",
                    property,
                    stat,
                    subtitle: `PF2E.ActionsCheck.${stat}`,
                };
            }
        }
    }

    static defaultCheckContext<ItemType extends ItemPF2e<ActorPF2e>>(
        options: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>
    ): CheckContext<ItemType> | undefined {
        const { checkType: type, property, stat: slug, subtitle } = this.resolveStat(data.slug);
        const statistic =
            options.actor.getStatistic(data.slug) ?? (getProperty(options.actor, property) as StatisticModifier);
        if (!statistic) {
            const { actor } = options;
            const message = `Actor ${actor.name} (${actor.id}) does not have a statistic for ${slug}.`;
            throw new CheckContextError(message, actor, slug);
        }
        const {
            actor,
            item,
            rollOptions: contextualRollOptions,
        } = options.buildContext({
            actor: options.actor,
            item: data.item,
            rollOptions: {
                contextual: [type, data.slug, ...data.rollOptions],
                generic: [...data.rollOptions],
            },
            target: options.target,
        });
        return {
            actor,
            item,
            modifiers: data.modifiers ?? [],
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
        translationKey?: string
    ): RollNotePF2e {
        const visible = game.settings.get("pf2e", "metagame_showResults");
        const outcomes = visible ? [outcome] : [];
        return new RollNotePF2e({
            selector,
            text: game.i18n.localize(translationKey ?? `${translationPrefix}.Notes.${outcome}`),
            outcome: outcomes,
        });
    }

    static outcomesNote(selector: string, translationKey: string, outcomes: DegreeOfSuccessString[]): RollNotePF2e {
        const visible = game.settings.get("pf2e", "metagame_showResults");
        const visibleOutcomes = visible ? outcomes : [];
        return new RollNotePF2e({
            selector: selector,
            text: game.i18n.localize(translationKey),
            outcome: visibleOutcomes,
        });
    }

    static async simpleRollActionCheck<ItemType extends ItemPF2e<ActorPF2e>>(
        options: SimpleRollActionCheckOptions<ItemType>
    ): Promise<void> {
        // figure out actors to roll for
        const rollers: ActorPF2e[] = [];
        if (Array.isArray(options.actors)) {
            rollers.push(...options.actors);
        } else if (options.actors) {
            rollers.push(options.actors);
        } else {
            rollers.push(...getSelectedOrOwnActors());
        }

        if (rollers.length === 0) {
            throw new Error(game.i18n.localize("PF2E.ActionsWarning.NoActor"));
        }

        const { token: target, actor: targetActor } = options.target?.() ?? this.target();
        const targetOptions = targetActor?.getSelfRollOptions("target") ?? [];

        for (const actor of rollers) {
            try {
                const selfToken = actor.getActiveTokens(false, true).shift();
                const {
                    actor: selfActor,
                    item: weapon,
                    modifiers = [],
                    rollOptions: combinedOptions,
                    statistic,
                    subtitle,
                    type,
                } = await options.checkContext({
                    actor,
                    buildContext: (args) => {
                        const action = "attack";
                        const combinedOptions = [
                            args.actor.getRollOptions(args.rollOptions.contextual),
                            args.rollOptions.generic,
                            options.traits,
                            targetOptions,
                            !!target?.object &&
                            !!selfToken?.object?.isFlanking(target.object, { reach: actor.getReach({ action }) })
                                ? "self:flanking"
                                : [],
                        ].flat();
                        const selfActor = args.actor.getContextualClone(
                            combinedOptions.filter((o) => o.startsWith("self:"))
                        );
                        combinedOptions.push(...(args.item?.getRollOptions("item") ?? []));
                        return { actor: selfActor, item: args.item, rollOptions: combinedOptions, target: args.target };
                    },
                    target: targetActor,
                })!;

                const header = await renderTemplate("./systems/pf2e/templates/chat/action/header.hbs", {
                    glyph: options.actionGlyph,
                    subtitle,
                    title: options.title,
                });

                const dc = ((): CheckDC | null => {
                    if (options.difficultyClass) {
                        return options.difficultyClass;
                    } else if (targetActor instanceof CreaturePF2e) {
                        // try to resolve target's defense stat and calculate DC
                        const dcStat = options.difficultyClassStatistic?.(targetActor);
                        if (dcStat) {
                            const extraRollOptions = combinedOptions.concat(targetOptions);
                            const { dc } = dcStat.withRollOptions({ extraRollOptions });
                            const dcData: CheckDC = { label: dc.label, statistic: dc, value: dc.value };
                            if (setHasElement(DC_SLUGS, dcStat.slug)) dcData.slug = dcStat.slug;

                            return dcData;
                        }
                    }
                    return null;
                })();

                const actionTraits: Record<string, string | undefined> = CONFIG.PF2E.actionTraits;
                const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
                const traitObjects = options.traits.map((trait) => ({
                    description: traitDescriptions[trait],
                    name: trait,
                    label: actionTraits[trait] ?? trait,
                }));

                const notes = options.extraNotes?.(statistic.slug) ?? [];

                const label = (await options.content?.(header)) ?? header;
                const title = `${game.i18n.localize(options.title)} - ${game.i18n.localize(subtitle)}`;

                if (statistic instanceof Statistic) {
                    await statistic.roll({
                        ...eventToRollParams(options.event),
                        token: selfToken,
                        label,
                        title,
                        dc,
                        extraRollNotes: notes,
                        extraRollOptions: combinedOptions,
                        modifiers,
                        target: targetActor,
                        traits: traitObjects,
                        createMessage: options.createMessage,
                        callback: (roll, outcome, message) => {
                            options.callback?.({ actor, message, outcome, roll });
                        },
                    });
                } else {
                    const check = new CheckModifier(label, statistic, modifiers);

                    const finalOptions = new Set(combinedOptions);
                    ensureProficiencyOption(finalOptions, statistic.rank ?? -1);
                    check.calculateTotal(finalOptions);

                    const distance = ((): number | null => {
                        const reach =
                            selfActor instanceof CreaturePF2e && weapon?.isOfType("weapon")
                                ? selfActor.getReach({ action: "attack", weapon }) ?? null
                                : null;
                        return selfToken?.object && target?.object
                            ? selfToken.object.distanceTo(target.object, { reach })
                            : null;
                    })();
                    const rangeIncrement =
                        weapon?.isOfType("weapon") && typeof distance === "number"
                            ? getRangeIncrement(weapon, distance)
                            : null;
                    const domains = ["all", type, statistic.slug];
                    const targetInfo =
                        target && targetActor && typeof distance === "number"
                            ? { token: target, actor: targetActor, distance, rangeIncrement }
                            : null;
                    const substitutions = extractRollSubstitutions(
                        actor.synthetics.rollSubstitutions,
                        domains,
                        finalOptions
                    );
                    const dosAdjustments = extractDegreeOfSuccessAdjustments(actor.synthetics, domains);

                    await CheckPF2e.roll(
                        check,
                        {
                            actor: selfActor,
                            token: selfToken,
                            item: weapon,
                            createMessage: options.createMessage,
                            target: targetInfo,
                            dc,
                            type,
                            options: finalOptions,
                            notes: [...notes, ...(statistic.notes ?? [])],
                            dosAdjustments,
                            substitutions,
                            traits: traitObjects,
                            title,
                        },
                        options.event,
                        (roll, outcome, message) => {
                            options.callback?.({ actor, message, outcome, roll });
                        }
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
        const targets = Array.from(game.user.targets).filter((t) => t.actor instanceof CreaturePF2e);
        const target = targets.shift()?.document ?? null;
        const targetActor = target?.actor ?? null;
        return {
            token: target,
            actor: targetActor,
        };
    }

    static getWeaponPotencyModifier(item: WeaponPF2e<ActorPF2e>, selector: string): ModifierPF2e | null {
        const slug = "potency";
        if (AutomaticBonusProgression.isEnabled(item.actor)) {
            return new ModifierPF2e({
                slug,
                type: "potency",
                label: "PF2E.AutomaticBonusProgression.attackPotency",
                modifier: item.actor.synthetics.weaponPotency["strike-attack-roll"]?.[0]?.bonus ?? 0,
                adjustments: extractModifierAdjustments(item.actor.synthetics.modifierAdjustments, [selector], slug),
            });
        } else if (item.system.runes.potency > 0) {
            return new ModifierPF2e({
                slug,
                type: "item",
                label: "PF2E.PotencyRuneLabel",
                modifier: item.system.runes.potency,
                adjustments: extractModifierAdjustments(item.actor.synthetics.modifierAdjustments, [selector], slug),
            });
        } else {
            return null;
        }
    }

    static getApplicableEquippedWeapons(actor: ActorPF2e, trait: WeaponTrait): WeaponPF2e<ActorPF2e>[] {
        if (actor.isOfType("character")) {
            return actor.system.actions.flatMap((s) => (s.ready && s.item.traits.has(trait) ? s.item : []));
        } else {
            return actor.itemTypes.weapon.filter((w) => w.isEquipped && w.traits.has(trait));
        }
    }
}
