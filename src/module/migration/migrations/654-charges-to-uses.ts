import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";
import { ConsumableSystemData } from "@item/consumable/data";

interface ConsumableSystemDataOld extends ConsumableSystemData {
    charges?: {
        value: number | string;
        max: number | string;
    };
    autoDestroy?: {
        value: boolean;
    };
    autoUse?: {
        value: boolean;
    };
    "-=charges"?: null;
    "-=autoDestroy"?: null;
    "-=autoUse"?: null;
}

export class Migration654ChargesToUses extends MigrationBase {
    static override version = 0.654;

    override async updateItem(itemData: ItemSourcePF2e) {
        if (itemData.type !== "consumable") return;

        const data: ConsumableSystemDataOld = itemData.data;
        if (data.charges) {
            data.uses.value = Number(data.charges.value);
            data.uses.max = Number(data.charges.max);
        }

        if (data.autoDestroy) {
            data.uses.autoDestroy = data.autoDestroy.value;
        }

        // If this is old data, make wands a per-day resource
        if ((data.charges || data.autoDestroy) && data.consumableType.value === "wand") {
            data.uses.per = "day";
        }

        delete data.charges;
        delete data.autoDestroy;
        delete data.autoUse;
        if ("game" in globalThis) {
            data["-=charges"] = null;
            data["-=autoDestroy"] = null;
            data["-=autoUse"] = null;
        }
    }
}
