import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Ensure weapon categories and ranges have valid properties */
export class Migration650StringifyWeaponProperties extends MigrationBase {
    static override version = 0.65;
    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "weapon") return;

        const systemData = itemData.data;
        systemData.weaponType.value ||= "simple";
        systemData.range ??= { value: "melee" };
        const range = itemData.data.range;
        range.value ||= "melee";
        range.value = range.value.trim();
        if (range.value.includes("reach")) range.value = "melee";
    }
}
