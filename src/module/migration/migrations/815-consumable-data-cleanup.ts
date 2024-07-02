import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ConsumableSystemSource } from "@item/consumable/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Clean up entries of consumable system data */
export class Migration815ConsumableDataCleanup extends MigrationBase {
    static override version = 0.815;

    consumableKeys = new Set([
        "autoDestroy",
        "baseItem",
        "bulk",
        "charges",
        "consumableType",
        "consume",
        "containerId",
        "description",
        "equipped",
        "equippedBulk",
        "hardness",
        "hp",
        "identification",
        "level",
        "negateBulk",
        "preciousMaterial",
        "preciousMaterialGrade",
        "price",
        "quantity",
        "rules",
        "schema",
        "size",
        "slug",
        "source",
        "spell",
        "stackGroup",
        "temporary",
        "traits",
        "usage",
        "weight",
    ]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "consumable") return;

        const systemData = source.system as ConsumableWithOtherKeys;
        for (const key of Object.keys(systemData)) {
            const value = systemData[key];
            if (!this.consumableKeys.has(key)) {
                delete systemData[key];
                systemData[`-=${key}`] = null;
            } else if (R.isPlainObject(value) && "_deprecated" in value) {
                delete value["_deprecated"];
                value[`-=_deprecated`] = null;
            }
        }
    }
}

interface ConsumableWithOtherKeys extends ConsumableSystemSource {
    [key: string]: unknown;
}
