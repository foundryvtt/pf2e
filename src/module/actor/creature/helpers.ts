import { ImmunityData } from "@actor/data/iwr.ts";
import { CreaturePF2e } from "./document.ts";
import { ImmunityType } from "@actor/types.ts";
import { MeleePF2e, WeaponPF2e } from "@item";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ErrorPF2e } from "@util";
import { PredicatePF2e } from "@system/predication.ts";

/** A static class of helper functions for applying automation for certain weapon traits on attack rolls */
class StrikeAttackTraits {
    protected static getLabel(traitOrTag: string): string {
        const traits: Record<string, string | undefined> = CONFIG.PF2E.weaponTraits;
        const tags: Record<string, string | undefined> = CONFIG.PF2E.otherWeaponTags;
        return traits[traitOrTag] ?? tags[traitOrTag] ?? traitOrTag;
    }

    protected static getUnannotatedTrait(trait: string): string {
        return trait.replace(/-d?\d{1,3}$/, "");
    }

    static createAttackModifiers({ weapon }: { weapon: WeaponPF2e | MeleePF2e }): ModifierPF2e[] {
        const { actor } = weapon;
        if (!actor) throw ErrorPF2e("The weapon must be embedded");

        return weapon.system.traits.value.flatMap((trait) => {
            const unannotatedTrait = this.getUnannotatedTrait(trait);
            switch (unannotatedTrait) {
                case "volley": {
                    if (!weapon.rangeIncrement) return [];

                    const penaltyRange = Number(/-(\d+)$/.exec(trait)![1]);
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: -2,
                        type: "untyped",
                        ignored: true,
                        predicate: new PredicatePF2e(
                            { lte: ["target:distance", penaltyRange] },
                            { not: "self:ignore-volley-penalty" }
                        ),
                    });
                }
                case "sweep": {
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: 1,
                        type: "circumstance",
                        predicate: new PredicatePF2e("self:sweep-bonus"),
                    });
                }
                case "backswing": {
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: 1,
                        type: "circumstance",
                        predicate: new PredicatePF2e("self:backswing-bonus"),
                    });
                }
                default:
                    return [];
            }
        });
    }
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
            "unconscious",
        ];
        for (const immunityType of constructImmunities) {
            if (!immunities.some((i) => i.type === immunityType)) {
                immunities.push(
                    new ImmunityData({ type: immunityType, source: game.i18n.localize("PF2E.TraitConstruct") })
                );
            }
        }
    }

    // "They are immune to all mental effects." – CRB pg. 634
    if (traits.has("mindless") && !immunities.some((i) => i.type === "mental")) {
        immunities.push(new ImmunityData({ type: "mental", source: game.i18n.localize("PF2E.TraitMindless") }));
    }
}

export { StrikeAttackTraits, setImmunitiesFromTraits };
