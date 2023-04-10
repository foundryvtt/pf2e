import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration636NumifyArmorData extends MigrationBase {
    static override version = 0.636;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "armor") return;

        const systemData = itemData.system;
        systemData.armor.value = Number(systemData.armor.value) || 0;
        systemData.check.value = Number(systemData.check.value) || 0;
        systemData.dex.value = Number(systemData.dex.value) || 0;
        systemData.strength.value = Number(systemData.strength.value) || 0;

        // This might have "ft" in the string
        if (typeof systemData.speed.value === "string") {
            systemData.speed.value = parseInt(systemData.speed.value, 10) || 0;
        }
    }
}
