import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";
import { MeleeDamageRoll } from "@item/melee/data";

/** Convert damageRolls arrays to objects. */
export class Migration607MeleeItemDamageRolls extends MigrationBase {
    static override version = 0.607;

    override async updateItem(itemData: ItemSourcePF2e) {
        if (itemData.type === "melee") {
            if (Array.isArray(itemData.system.damageRolls)) {
                const damageRolls: Record<string, MeleeDamageRoll> = {};
                itemData.system.damageRolls.forEach((roll) => {
                    const key = randomID(20);
                    damageRolls[key] = roll;
                });
                itemData.system.damageRolls = damageRolls;
            }
        }
    }
}
