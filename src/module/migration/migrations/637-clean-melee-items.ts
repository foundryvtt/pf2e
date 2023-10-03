import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

const meleeKeys = new Set([
    "description",
    "source",
    "traits",
    "rules",
    "slug",
    "weaponType",
    "attack",
    "damageRolls",
    "bonus",
    "attackEffects",
]);

/** Remove physical item data from melee items */
export class Migration637CleanMeleeItems extends MigrationBase {
    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "melee") return;

        const systemData = itemData.system;
        for (const key of Object.keys(systemData)) {
            if (!meleeKeys.has(key)) {
                delete systemData[key as keyof typeof systemData];
            }
        }
    }
}
