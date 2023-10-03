import { ItemSourcePF2e } from "@item/data/index.ts";
import { WeaponSystemSource } from "@item/weapon/data.ts";
import { WeaponCategory, WeaponRangeIncrement } from "@item/weapon/types.ts";
import { MigrationBase } from "../base.ts";

/** Ensure weapon categories and ranges have valid properties */
export class Migration650StringifyWeaponProperties extends MigrationBase {
    static override version = 0.65;
    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "weapon") return;

        const systemData: MaybeOldData = itemData.system;
        if (systemData.weaponType) {
            systemData.weaponType.value ||= "simple";
        }
        const range = (systemData.range ??= { value: "melee" });
        if (range instanceof Object && typeof range.value === "string") {
            range.value = range.value.trim() || "melee";
            if (range.value === "reach") range.value = "melee";
        }
    }
}

type MaybeOldData = Omit<WeaponSystemSource, "range"> & {
    weaponType?: { value: WeaponCategory };
    range: WeaponRangeIncrement | null | { value: unknown };
};
