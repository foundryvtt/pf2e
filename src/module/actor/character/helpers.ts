import { ArmorPF2e, WeaponPF2e } from "@item";
import { ModifierPF2e, MODIFIER_TYPE } from "@actor/modifiers";
import { PredicatePF2e } from "@system/predication";
import { ErrorPF2e, objectHasKey, setHasElement } from "@util";
import { DAMAGE_DIE_FACES } from "@system/damage/values";
import { extractModifierAdjustments } from "@module/rules/helpers";
import { type CharacterPF2e } from ".";

/** Handle weapon traits that introduce modifiers or add other weapon traits */
class StrikeWeaponTraits {
    static adjustWeapon(weapon: WeaponPF2e): void {
        const traits = weapon.system.traits.value;
        for (const trait of [...traits]) {
            switch (trait.replace(/-d?\d{1,3}$/, "")) {
                case "fatal-aim": {
                    if (weapon.rangeIncrement && weapon.handsHeld === 2) {
                        const fatal = trait.replace("-aim", "");
                        if (objectHasKey(CONFIG.PF2E.weaponTraits, fatal) && !traits.includes(fatal)) {
                            traits.push(fatal);
                        }
                    }
                    break;
                }
                case "jousting": {
                    if (weapon.handsHeld === 1) {
                        const die = /(d\d{1,2})$/.exec(trait)?.[1];
                        if (setHasElement(DAMAGE_DIE_FACES, die)) {
                            weapon.system.damage.die = die;
                        }
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }

    static createAttackModifiers(weapon: WeaponPF2e, domains: string[]): ModifierPF2e[] {
        const { actor } = weapon;
        if (!actor) throw ErrorPF2e("The weapon must be embedded");

        const traitsAndTags = [weapon.system.traits.value, weapon.system.traits.otherTags].flat();

        const getLabel = (traitOrTag: string): string => {
            const traits: Record<string, string | undefined> = CONFIG.PF2E.weaponTraits;
            const tags: Record<string, string | undefined> = CONFIG.PF2E.otherWeaponTags;
            return traits[traitOrTag] ?? tags[traitOrTag] ?? traitOrTag;
        };

        return traitsAndTags
            .flatMap((trait) => {
                const reducedTrait = trait.replace(/-d?\d{1,3}$/, "");
                switch (reducedTrait) {
                    case "kickback": {
                        // "Firing a kickback weapon gives a –2 circumstance penalty to the attack roll, but characters with
                        // 14 or more Strength ignore the penalty."
                        return new ModifierPF2e({
                            slug: reducedTrait,
                            label: CONFIG.PF2E.weaponTraits.kickback,
                            modifier: -2,
                            type: MODIFIER_TYPE.CIRCUMSTANCE,
                            predicate: new PredicatePF2e({ lt: ["ability:str:score", 14] }),
                        });
                    }
                    case "volley": {
                        if (!weapon.rangeIncrement) return [];

                        const penaltyRange = Number(/-(\d+)$/.exec(trait)![1]);
                        return new ModifierPF2e({
                            slug: reducedTrait,
                            label: getLabel(trait),
                            modifier: -2,
                            type: MODIFIER_TYPE.UNTYPED,
                            ignored: true,
                            predicate: new PredicatePF2e(
                                { lte: ["target:distance", penaltyRange] },
                                { not: "self:ignore-volley-penalty" }
                            ),
                        });
                    }
                    case "improvised": {
                        return new ModifierPF2e({
                            slug: reducedTrait,
                            label: getLabel(trait),
                            modifier: -2,
                            type: MODIFIER_TYPE.ITEM,
                            predicate: new PredicatePF2e({ not: "self:ignore-improvised-penalty" }),
                        });
                    }
                    case "sweep": {
                        return new ModifierPF2e({
                            slug: reducedTrait,
                            label: getLabel(trait),
                            modifier: 1,
                            type: MODIFIER_TYPE.CIRCUMSTANCE,
                            predicate: new PredicatePF2e("self:sweep-bonus"),
                        });
                    }
                    case "backswing": {
                        return new ModifierPF2e({
                            slug: reducedTrait,
                            label: getLabel(trait),
                            modifier: 1,
                            type: MODIFIER_TYPE.CIRCUMSTANCE,
                            predicate: new PredicatePF2e("self:backswing-bonus"),
                        });
                    }
                    default:
                        return [];
                }
            })
            .map((modifier) => {
                const synthetics = actor.synthetics.modifierAdjustments;
                modifier.adjustments = extractModifierAdjustments(synthetics, domains, modifier.slug);
                return modifier;
            });
    }
}

/** Create a penalty for attempting to Force Open without a crowbar or equivalent tool */
function createForceOpenPenalty(actor: CharacterPF2e, domains: string[]): ModifierPF2e {
    const slug = "no-crowbar";
    const { modifierAdjustments } = actor.synthetics;
    return new ModifierPF2e({
        slug,
        label: "PF2E.Actions.ForceOpen.NoCrowbarPenalty",
        type: "item",
        modifier: -2,
        predicate: ["action:force-open", "action:force-open:prying"],
        hideIfDisabled: true,
        adjustments: extractModifierAdjustments(modifierAdjustments, domains, slug),
    });
}

function createShoddyPenalty(
    actor: CharacterPF2e,
    item: WeaponPF2e | ArmorPF2e,
    domains: string[]
): ModifierPF2e | null {
    if (!item.isShoddy) return null;

    const slug = "shoddy";
    const { modifierAdjustments } = actor.synthetics;
    return new ModifierPF2e({
        label: "PF2E.Item.Physical.OtherTag.Shoddy",
        type: "item",
        slug,
        modifier: -2,
        adjustments: extractModifierAdjustments(modifierAdjustments, domains, slug),
    });
}

export { createForceOpenPenalty, createShoddyPenalty, StrikeWeaponTraits };
