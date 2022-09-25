import { ModifierPF2e, MODIFIER_TYPE } from "@actor/modifiers";
import { MeleePF2e } from "@item/melee";
import { PredicatePF2e } from "@system/predication";

class StrikeAttackTraits {
    static createAttackModifiers(strike: MeleePF2e): ModifierPF2e[] {
        const traits = strike.system.traits.value;

        const getLabel = (traitOrTag: string): string => {
            const traits: Record<string, string | undefined> = CONFIG.PF2E.weaponTraits;
            const tags: Record<string, string | undefined> = CONFIG.PF2E.otherWeaponTags;
            return traits[traitOrTag] ?? tags[traitOrTag] ?? traitOrTag;
        };

        return traits.flatMap((trait) => {
            switch (trait.replace(/-d?\d{1,3}$/, "")) {
                case "sweep": {
                    return new ModifierPF2e({
                        label: getLabel(trait),
                        modifier: 1,
                        type: MODIFIER_TYPE.CIRCUMSTANCE,
                        predicate: new PredicatePF2e("sweep-bonus"),
                    });
                }
                case "backswing": {
                    return new ModifierPF2e({
                        label: getLabel(trait),
                        modifier: 1,
                        type: MODIFIER_TYPE.CIRCUMSTANCE,
                        predicate: new PredicatePF2e("backswing-bonus"),
                    });
                }
                default:
                    return [];
            }
        });
    }
}

export { StrikeAttackTraits };
