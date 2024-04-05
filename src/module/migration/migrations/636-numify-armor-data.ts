import { ArmorSystemSource } from "@item/armor/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration636NumifyArmorData extends MigrationBase {
    static override version = 0.636;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "armor") return;

        const system: ArmorSystemSourceWithObjectProperties = source.system;

        if (R.isObject(system.armor)) {
            system.armor.value = Number(system.armor.value) || 0;
        }
        if (R.isObject(system.check)) {
            system.check.value = Number(system.check.value) || 0;
        }
        if (R.isObject(system.dex)) {
            system.dex.value = Number(system.dex.value) || 0;
        }
        if (R.isObject(system.strength)) {
            system.strength.value = Number(system.strength.value) || 0;
        }

        // This might have "ft" in the string
        if (R.isObject(system.speed) && typeof system.speed.value === "string") {
            system.speed.value = parseInt(system.speed.value, 10) || 0;
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
