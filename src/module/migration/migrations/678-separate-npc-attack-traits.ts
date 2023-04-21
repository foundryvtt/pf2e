import { ItemSourcePF2e } from "@item/data/index.ts";
import { RARITIES } from "@module/data.ts";
import { isObject, tupleHasValue } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove exclusive NPC attack traits from weapons */
export class Migration678SeparateNPCAttackTraits extends MigrationBase {
    static override version = 0.678;

    override async updateItem(itemSource: ItemWithRarityObject): Promise<void> {
        if (itemSource.type === "weapon") {
            const weaponTraits = itemSource.system.traits.value;
            const rangeTraits = weaponTraits.filter((trait) => /^range(?!d)/.test(trait));
            for (const trait of rangeTraits) {
                weaponTraits.splice(weaponTraits.indexOf(trait), 1);
            }
            const reloadTraits = weaponTraits.filter((trait) => trait.startsWith("reload"));
            for (const trait of reloadTraits) {
                weaponTraits.splice(weaponTraits.indexOf(trait), 1);
            }
            itemSource.system.traits.value = [...new Set(weaponTraits)].sort();
        }

        // While we're at it ...
        if (!itemSource.system.traits) return;
        const itemTraits: string[] = itemSource.system.traits.value ?? [];
        for (const trait of itemTraits) {
            if (tupleHasValue(RARITIES, trait)) {
                itemTraits.splice(itemTraits.indexOf(trait), 1);
                if (
                    trait !== "common" &&
                    isObject(itemSource.system.traits.rarity) &&
                    itemSource.system.traits.rarity.value === "common"
                ) {
                    itemSource.system.traits.rarity.value = trait;
                }
            }
        }
    }
}

type ItemWithRarityObject = ItemSourcePF2e & {
    system: {
        traits?: {
            rarity: string | { value: string };
        };
    };
};
