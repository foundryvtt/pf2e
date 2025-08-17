import type { ActorPF2e, CreaturePF2e } from "@actor";
import { Immunity } from "@actor/data/iwr.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ImmunityType } from "@actor/types.ts";
import type { AbilityItemPF2e, MeleePF2e, WeaponPF2e } from "@item";
import { ConditionPF2e } from "@item";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { Predicate } from "@system/predication.ts";
import { ErrorPF2e } from "@util";

/** A static class of helper functions for applying automation for certain weapon traits on attack rolls */
class AttackTraitHelpers {
    protected static getLabel(traitOrTag: string): string {
        const traits: Record<string, string | undefined> = CONFIG.PF2E.weaponTraits;
        const tags: Record<string, string | undefined> = CONFIG.PF2E.otherWeaponTags;
        return traits[traitOrTag] ?? tags[traitOrTag] ?? traitOrTag;
    }

    protected static getUnannotatedTrait(trait: string): string {
        return trait.replace(/-d?\d{1,3}$/, "");
    }

    static createAttackModifiers({ item, domains }: CreateAttackModifiersParams): ModifierPF2e[] {
        const actor = item.actor;
        if (!actor) throw ErrorPF2e("The weapon must be embedded");

        return item.system.traits.value.flatMap((trait) => {
            const unannotatedTrait = this.getUnannotatedTrait(trait);
            switch (unannotatedTrait) {
                case "volley": {
                    const rangeIncrement = item.range?.increment;
                    if (!rangeIncrement) return [];

                    const penaltyRange = Number(/-(\d+)$/.exec(trait)![1]);
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: -2,
                        type: "untyped",
                        ignored: true,
                        predicate: new Predicate(
                            { lte: ["target:distance", penaltyRange] },
                            { not: "self:ignore-volley-penalty" },
                        ),
                        adjustments: extractModifierAdjustments(
                            actor.synthetics.modifierAdjustments,
                            domains,
                            unannotatedTrait,
                        ),
                    });
                }
                case "sweep": {
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: 1,
                        type: "circumstance",
                        predicate: new Predicate("sweep-bonus"),
                    });
                }
                case "backswing": {
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: 1,
                        type: "circumstance",
                        predicate: new Predicate("backswing-bonus"),
                    });
                }
                default:
                    return [];
            }
        });
    }
}

interface CreateAttackModifiersParams {
    item: AbilityItemPF2e<ActorPF2e> | WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>;
    domains: string[];
}

/** Set immunities for creatures with traits call for them */
function setImmunitiesFromTraits(actor: CreaturePF2e): void {
    if (actor.isOfType("character")) return;

    const traits = actor.system.traits.value;
    const immunities = actor.attributes.immunities;
    const existing = immunities.map((i) => i.type);
    if (traits.includes("construct") && !traits.includes("eidolon")) {
        // "Constructs are often mindless; they're immune to bleed damage, death effects, disease, healing,
        // nonlethal attacks, poison, vitality, void, and the doomed, drained, fatigued, paralyzed, sickened, and
        // unconscious conditions; and they might have Hardness based on the materials used to construct their bodies."
        // – GMC pg. 328
        const constructImmunities: ImmunityType[] = [
            "bleed",
            "death-effects",
            "disease",
            "doomed",
            "drained",
            "fatigued",
            "healing",
            "nonlethal-attacks",
            "paralyzed",
            "poison",
            "sickened",
            "spirit",
            "unconscious",
            "vitality",
            "void",
        ];
        for (const immunityType of constructImmunities) {
            if (!existing.includes(immunityType)) {
                immunities.push(
                    new Immunity({ type: immunityType, source: game.i18n.localize("PF2E.TraitConstruct") }),
                );
            }
        }
    }

    // "They are immune to all mental effects." – GMC pg. 331
    if (traits.includes("mindless") && !existing.includes("mental")) {
        immunities.push(new Immunity({ type: "mental", source: game.i18n.localize("PF2E.TraitMindless") }));
    }

    // "Swarms are immune to the grappled [sic], prone, and restrained conditions." – GMC pg. 334
    if (traits.includes("swarm")) {
        for (const immunity of ["grabbed", "prone", "restrained"] as const) {
            if (!existing.includes(immunity)) {
                immunities.push(new Immunity({ type: immunity, source: game.i18n.localize("PF2E.TraitSwarm") }));
            }
        }
    }
}

function imposeEncumberedCondition(actor: CreaturePF2e): void {
    if (!game.pf2e.settings.encumbrance) return;
    if (actor.inventory.bulk.isEncumbered && actor.conditions.bySlug("encumbered").length === 0) {
        const source = game.pf2e.ConditionManager.getCondition("encumbered").toObject();
        const encumbered = new ConditionPF2e(fu.mergeObject(source, { _id: "xxxENCUMBEREDxxx" }), {
            parent: actor,
        }) as ConditionPF2e<CreaturePF2e>;
        actor.conditions.set(encumbered.id, encumbered);
        encumbered.prepareSiblingData();
        encumbered.prepareActorData();
        for (const rule of encumbered.prepareRuleElements()) {
            rule.onApplyActiveEffects?.();
            rule.beforePrepareData?.();
        }
    }
}

export { AttackTraitHelpers, imposeEncumberedCondition, setImmunitiesFromTraits };
