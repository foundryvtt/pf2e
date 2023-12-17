import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";
import { ArmorSystemSource } from "@item/armor/index.ts";
import { isObject } from "@util";

export class Migration636NumifyArmorData extends MigrationBase {
    static override version = 0.636;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "armor") return;

        const systemData: ArmorSystemSourceWithObjectProperties = source.system;

        if (isObject(systemData.armor)) {
            systemData.armor.value = Number(systemData.armor.value) || 0;
        }
        if (isObject(systemData.check)) {
            systemData.check.value = Number(systemData.check.value) || 0;
        }
        if (isObject(systemData.dex)) {
            systemData.dex.value = Number(systemData.dex.value) || 0;
        }
        if (isObject(systemData.strength)) {
            systemData.strength.value = Number(systemData.strength.value) || 0;
        }

        // This might have "ft" in the string
        if (isObject(systemData.speed) && typeof systemData.speed.value === "string") {
            systemData.speed.value = parseInt(systemData.speed.value, 10) || 0;
        }
    }
}

type ArmorSystemSourceWithObjectProperties = ArmorSystemSource & {
    armor?: { value: number };
    check?: { value: number };
    dex?: { value: number };
    strength: number | null | { value: number };
    speed?: { value: number };
};
