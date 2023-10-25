import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";
import { isObject, tupleHasValue } from "@util";

/**  Flatten several numeric value object properties into numbers */
export class Migration848NumericArmorProperties extends MigrationBase {
    static override version = 0.848;

    #oldToNew = [
        ["armor", "acBonus"],
        ["dex", "dexCap"],
        ["check", "checkPenalty"],
        ["speed", "speedPenalty"],
        ["strength", "strength"],
    ] as const;

    override async updateItem(source: ItemMaybeWithOldProperty): Promise<void> {
        if (source.type !== "armor") return;

        for (const [oldKey, newKey] of this.#oldToNew) {
            const oldProperty = source.system[oldKey];
            const newProperty = isObject(source.system[newKey]) ? 0 : source.system[newKey] ?? 0;
            if (isObject<{ value: unknown }>(oldProperty) && newProperty === 0) {
                delete source.system[oldKey];
                if (oldKey === "strength") {
                    const value = Number(oldProperty.value) || null;
                    source.system[newKey] = value === null ? null : Math.max(Math.floor((value - 10) / 2), 0);
                } else if (tupleHasValue(["checkPenalty", "speedPenalty"], newKey)) {
                    source.system[newKey] = Number(oldProperty.value) || null;
                    source.system[`-=${oldKey}`] = null;
                } else {
                    source.system[newKey] = Number(oldProperty.value) || 0;
                    source.system[`-=${oldKey}`] = null;
                }
            }
        }
    }
}

type ItemMaybeWithOldProperty = ItemSourcePF2e & {
    system: {
        armor?: unknown;
        "-=armor"?: unknown;
        dex?: unknown;
        "-=dex"?: unknown;
        check?: unknown;
        "-=check"?: unknown;
        speed?: unknown;
        "-=speed"?: unknown;
    };
};
