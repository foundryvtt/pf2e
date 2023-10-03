import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { NPCAttackDamage } from "@item/melee/data.ts";

/** Convert damageRolls arrays to objects. */
export class Migration607MeleeItemDamageRolls extends MigrationBase {
    static override version = 0.607;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type === "melee") {
            if (Array.isArray(itemData.system.damageRolls)) {
                const damageRolls: Record<string, NPCAttackDamage> = {};
                itemData.system.damageRolls.forEach((roll) => {
                    const key = randomID(20);
                    damageRolls[key] = roll;
                });
                itemData.system.damageRolls = damageRolls;
            }
        }
    }
}
