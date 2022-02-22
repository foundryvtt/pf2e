import { WeaponPF2e } from "@item";
import { WeaponTrait } from "@item/weapon/data";
import { ModifierPF2e, MODIFIER_TYPE } from "@module/modifiers";
import { PredicatePF2e } from "@system/predication";

/** Handle weapon traits that introduce modifiers or add other weapon traits */
class StrikeWeaponTraits {
    static modifyWeapon(weapon: WeaponPF2e): void {
        const traits = weapon.data.data.traits.value;
        for (const trait of traits) {
            switch (trait.replace(/-d?\d{1,3}$/, "")) {
                case "fatal-aim": {
                    if (weapon.rangeIncrement && weapon.handsHeld === 2) {
                        const fatal = trait.replace("-aim", "") as WeaponTrait;
                        weapon.data.data.traits.value.push(fatal);
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }

    static createAttackModifiers(weapon: WeaponPF2e): ModifierPF2e[] {
        const traitsAndTags = [weapon.data.data.traits.value, weapon.data.data.traits.otherTags].flat();

        const getLabel = (traitOrTag: string): string => {
            const traits: Record<string, string | undefined> = CONFIG.PF2E.weaponTraits;
            const tags: Record<string, string | undefined> = CONFIG.PF2E.otherWeaponTags;
            return traits[traitOrTag] ?? tags[traitOrTag] ?? traitOrTag;
        };

        return traitsAndTags.flatMap((trait) => {
            switch (trait.replace(/-d?\d{1,3}$/, "")) {
                case "kickback": {
                    // "Firing a kickback weapon gives a –2 circumstance penalty to the attack roll, but characters with
                    // 14 or more Strength ignore the penalty."
                    return new ModifierPF2e({
                        label: CONFIG.PF2E.weaponTraits.kickback,
                        modifier: -2,
                        type: MODIFIER_TYPE.CIRCUMSTANCE,
                        predicate: new PredicatePF2e({ all: [{ lt: ["self:ability:str:score", 14] }] }),
                    });
                }
                case "volley": {
                    if (!weapon.rangeIncrement) return [];

                    const penaltyRange = Number(/-(\d+)$/.exec(trait)![1]);
                    return new ModifierPF2e({
                        label: getLabel(trait),
                        modifier: -2,
                        type: MODIFIER_TYPE.UNTYPED,
                        ignored: true,
                        predicate: new PredicatePF2e({
                            all: [{ lte: ["target:distance", penaltyRange] }],
                            not: ["self:ignore-volley-penalty"],
                        }),
                    });
                }
                default:
                    return [];
            }
        });
    }
}

export { StrikeWeaponTraits };
