import { ActorPF2e } from "@actor";
import { Immunity } from "@actor/data/iwr.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ImmunityType } from "@actor/types.ts";
import { AbilityItemPF2e, ConditionPF2e, MeleePF2e, WeaponPF2e } from "@item";
import { PredicatePF2e } from "@system/predication.ts";
import { ErrorPF2e } from "@util";
import { CreaturePF2e } from "./document.ts";

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

    static createAttackModifiers({ item }: CreateAttackModifiersParams): ModifierPF2e[] {
        const { actor } = item;
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
                        predicate: new PredicatePF2e(
                            { lte: ["target:distance", penaltyRange] },
                            { not: "self:ignore-volley-penalty" },
                        ),
                    });
                }
                case "sweep": {
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: 1,
                        type: "circumstance",
                        predicate: new PredicatePF2e("sweep-bonus"),
                    });
                }
                case "backswing": {
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: 1,
                        type: "circumstance",
                        predicate: new PredicatePF2e("backswing-bonus"),
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
}

/** Set immunities for creatures with traits call for them */
function setImmunitiesFromTraits(actor: CreaturePF2e): void {
    if (actor.isOfType("character")) return;

    const { traits } = actor;
    const { immunities } = actor.attributes;

    if (traits.has("construct") && !traits.has("eidolon")) {
        // "Constructs are often mindless; they are immune to bleed damage, death effects, disease, healing, necromancy,
        // nonlethal attacks, poison, and the doomed, drained, fatigued, paralyzed, sickened, and unconscious
        // conditions; and they may have Hardness based on the materials used to construct their bodies."
        // – Bestiary 2 pg. 346
        const constructImmunities: ImmunityType[] = [
            "bleed",
            "death-effects",
            "disease",
            "doomed",
            "drained",
            "fatigued",
            "healing",
            "necromancy",
            "nonlethal-attacks",
            "paralyzed",
            "poison",
            "sickened",
            "spirit",
            "unconscious",
        ];
        for (const immunityType of constructImmunities) {
            if (!immunities.some((i) => i.type === immunityType)) {
                immunities.push(
                    new Immunity({ type: immunityType, source: game.i18n.localize("PF2E.TraitConstruct") }),
                );
            }
        }
    }

    // "They are immune to all mental effects." – CRB pg. 634
    if (traits.has("mindless") && !immunities.some((i) => i.type === "mental")) {
        immunities.push(new Immunity({ type: "mental", source: game.i18n.localize("PF2E.TraitMindless") }));
    }
}

function imposeEncumberedCondition(actor: CreaturePF2e): void {
    if (!game.settings.get("pf2e", "automation.encumbrance")) return;
    if (actor.inventory.bulk.isEncumbered && actor.conditions.bySlug("encumbered").length === 0) {
        const source = game.pf2e.ConditionManager.getCondition("encumbered").toObject();
        const encumbered = new ConditionPF2e(mergeObject(source, { _id: "xxxENCUMBEREDxxx" }), { parent: actor });
        encumbered.prepareSiblingData();
        encumbered.prepareActorData();
        for (const rule of encumbered.prepareRuleElements()) {
            rule.beforePrepareData?.();
        }
        actor.conditions.set(encumbered.id, encumbered);
    }
}

export { AttackTraitHelpers, imposeEncumberedCondition, setImmunitiesFromTraits };
