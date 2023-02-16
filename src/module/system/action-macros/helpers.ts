import { ActorPF2e, CreaturePF2e } from "@actor";
import { DC_SLUGS, SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values";
import {
    CheckModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    MODIFIER_TYPE,
    StatisticModifier,
} from "@actor/modifiers";
import { ItemPF2e, WeaponPF2e } from "@item";
import { WeaponTrait } from "@item/weapon/types";
import { RollNotePF2e } from "@module/notes";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractRollSubstitutions,
} from "@module/rules/helpers";
import { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success";
import { setHasElement, sluggify } from "@util";
import { getSelectedOrOwnActors } from "@util/token-actor-utils";
import { SimpleRollActionCheckOptions } from "./types";
import { getRangeIncrement } from "@actor/helpers";
import { CheckPF2e, CheckType } from "@system/check";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression";

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
                    property: "system.attributes.perception",
                    stat,
                    subtitle: "PF2E.ActionsCheck.perception",
                };
            default: {
                const slug = sluggify(stat);
                const shortForm = setHasElement(SKILL_LONG_FORMS, slug) ? SKILL_EXPANDED[slug].shortform : slug;
                const property = `system.skills.${shortForm}`;

                return {
                    checkType: "skill-check",
                    property,
                    stat,
                    subtitle: `PF2E.ActionsCheck.${stat}`,
                };
            }
        }
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

    static async simpleRollActionCheck<ItemType extends Embedded<ItemPF2e>>(
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

        const { token: target, actor: targetActor } = options.target?.() ?? this.target();

        if (rollers.length === 0) {
            return ui.notifications.warn(game.i18n.localize("PF2E.ActionsWarning.NoActor"));
        }

        for (const actor of rollers) {
            const targetOptions = targetActor?.getSelfRollOptions("target") ?? [];
            const selfToken = actor.getActiveTokens(false, true).shift();
            const combinedOptions = [
                actor.getRollOptions(options.rollOptions),
                options.extraOptions,
                options.traits,
                targetOptions,
                !!target?.object &&
                !!selfToken?.object.isFlanking(target.object, { reach: actor.getReach({ action: "attack" }) })
                    ? "self:flanking"
                    : [],
            ].flat();
            const selfActor = actor.getContextualClone(combinedOptions.filter((o) => o.startsWith("self:")));

            const subtitle =
                typeof options.subtitle === "function"
                    ? await options.subtitle?.({ actor: selfActor, target: targetActor })
                    : options.subtitle;
            const header = await renderTemplate("./systems/pf2e/templates/chat/action/header.hbs", {
                glyph: options.actionGlyph,
                subtitle,
                title: options.title,
            });
            const content = (await options.content?.(header)) ?? header;

            const weapon = options.item?.(selfActor);
            combinedOptions.push(...(weapon?.getRollOptions("item") ?? []));

            const stat = getProperty(selfActor, options.statName) as StatisticModifier & { rank?: number };

            const modifiers =
                (typeof options.modifiers === "function"
                    ? options.modifiers({ actor: selfActor, item: weapon, rollOptions: options.rollOptions })
                    : options.modifiers) ?? [];
            const check = new CheckModifier(content, stat, modifiers);

            const dc = ((): CheckDC | null => {
                if (options.difficultyClass) {
                    return options.difficultyClass;
                } else if (targetActor instanceof CreaturePF2e) {
                    // try to resolve target's defense stat and calculate DC
                    const dcStat = options.difficultyClassStatistic?.(targetActor);
                    if (dcStat) {
                        const extraRollOptions = combinedOptions.concat(targetOptions);
                        const { dc } = dcStat.withRollOptions({ extraRollOptions });
                        const dcData: CheckDC = { value: dc.value };
                        if (setHasElement(DC_SLUGS, dcStat.slug)) dcData.slug = dcStat.slug;

                        return dcData;
                    }
                }
                return null;
            })();

            const finalOptions = new Set(combinedOptions);
            ensureProficiencyOption(finalOptions, stat.rank ?? -1);
            check.calculateTotal(finalOptions);

            const actionTraits: Record<string, string | undefined> = CONFIG.PF2E.actionTraits;
            const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
            const traitObjects = options.traits.map((trait) => ({
                description: traitDescriptions[trait],
                name: trait,
                label: actionTraits[trait] ?? trait,
            }));

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
                weapon?.isOfType("weapon") && typeof distance === "number" ? getRangeIncrement(weapon, distance) : null;

            const targetInfo =
                target && targetActor && typeof distance === "number"
                    ? { token: target, actor: targetActor, distance, rangeIncrement }
                    : null;
            const notes = [stat.notes ?? [], options.extraNotes?.(options.statName) ?? []].flat();
            const substitutions = extractRollSubstitutions(
                actor.synthetics.rollSubstitutions,
                [stat.slug],
                finalOptions
            );

            const dosAdjustments = extractDegreeOfSuccessAdjustments(actor.synthetics, [stat.slug]);

            CheckPF2e.roll(
                check,
                {
                    actor: selfActor,
                    token: selfToken,
                    item: weapon,
                    createMessage: options.createMessage,
                    target: targetInfo,
                    dc,
                    type: options.checkType,
                    options: finalOptions,
                    notes,
                    dosAdjustments,
                    substitutions,
                    traits: traitObjects,
                    title: `${game.i18n.localize(options.title)} - ${game.i18n.localize(subtitle)}`,
                },
                options.event,
                (roll, outcome, message) => {
                    options.callback?.({ actor, message, outcome, roll });
                }
            );
        }
    }

    static target() {
        const targets = Array.from(game.user.targets).filter((t) => t.actor instanceof CreaturePF2e);
        const target = targets.shift()?.document ?? null;
        const targetActor = target?.actor ?? null;
        return {
            token: target,
            actor: targetActor,
        };
    }

    static getWeaponPotencyModifier(item: Embedded<WeaponPF2e>, selector: string): ModifierPF2e | null {
        const slug = "potency";
        if (AutomaticBonusProgression.isEnabled(item.actor)) {
            return new ModifierPF2e({
                slug,
                type: MODIFIER_TYPE.POTENCY,
                label: "PF2E.AutomaticBonusProgression.attackPotency",
                modifier: item.actor.synthetics.weaponPotency["mundane-attack"]?.[0]?.bonus ?? 0,
                adjustments: extractModifierAdjustments(item.actor.synthetics.modifierAdjustments, [selector], slug),
            });
        } else if (item.system.runes.potency > 0) {
            return new ModifierPF2e({
                slug,
                type: MODIFIER_TYPE.ITEM,
                label: "PF2E.PotencyRuneLabel",
                modifier: item.system.runes.potency,
                adjustments: extractModifierAdjustments(item.actor.synthetics.modifierAdjustments, [selector], slug),
            });
        } else {
            return null;
        }
    }

    static getApplicableEquippedWeapons(actor: ActorPF2e, trait: WeaponTrait): Embedded<WeaponPF2e>[] {
        if (actor.isOfType("character")) {
            return actor.system.actions.flatMap((s) => (s.ready && s.item.traits.has(trait) ? s.item : []));
        } else {
            return actor.itemTypes.weapon.filter((w) => w.isEquipped && w.traits.has(trait));
        }
    }
}
