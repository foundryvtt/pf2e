import { ItemSourcePF2e } from "@item/data";
import { RARITIES } from "@module/data";
import { isObject, tupleHasValue } from "@util";
import { MigrationBase } from "../base";

/** Remove exclusive NPC attack traits from weapons */
export class Migration678SeparateNPCAttackTraits extends MigrationBase {
    static override version = 0.678;

    override async updateItem(itemSource: ItemWithRarityObject): Promise<void> {
        if (itemSource.type === "weapon") {
            const weaponTraits = itemSource.data.traits.value;
            const rangeTraits = weaponTraits.filter((trait) => /^range(?!d)/.test(trait));
            for (const trait of rangeTraits) {
                weaponTraits.splice(weaponTraits.indexOf(trait), 1);
            }
            const reloadTraits = weaponTraits.filter((trait) => trait.startsWith("reload"));
            for (const trait of reloadTraits) {
                weaponTraits.splice(weaponTraits.indexOf(trait), 1);
            }
            itemSource.data.traits.value = [...new Set(weaponTraits)].sort();
        }

        // While we're at it ...
        if (!itemSource.data.traits) return;
        const itemTraits: string[] = itemSource.data.traits.value;
        for (const trait of itemTraits) {
            if (tupleHasValue(RARITIES, trait)) {
                itemTraits.splice(itemTraits.indexOf(trait), 1);
                if (
                    trait !== "common" &&
                    isObject(itemSource.data.traits.rarity) &&
                    itemSource.data.traits.rarity.value === "common"
                ) {
                    itemSource.data.traits.rarity.value = trait;
                }
            }
        }
    }
}

type ItemWithRarityObject = ItemSourcePF2e & {
    data: {
        traits?: {
            rarity: string | { value: string };
        };
    };
};
