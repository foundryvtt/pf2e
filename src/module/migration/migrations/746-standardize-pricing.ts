import { ItemSourcePF2e } from "@item/data/index.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { TreasureSystemSource } from "@item/treasure/data.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { MigrationBase } from "../base.ts";
import { isObject } from "@util";

export class Migration746StandardizePricing extends MigrationBase {
    static override version = 0.746;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (!isPhysicalData(item) && item.type !== "kit") return;

        if (!isObject(item.system.price)) {
            item.system.price = { value: CoinsPF2e.fromString(String(item.system.price)).toObject() };
        }

        if (item.type === "treasure") {
            const systemData: TreasureSystemOld = item.system;
            if (systemData.denomination || systemData.value) {
                const value = systemData.value?.value ?? 0;
                const denomination = systemData.denomination?.value ?? "gp";
                systemData.price = { value: { [denomination]: value } };

                systemData["-=denomination"] = null;
                delete systemData.denomination;
                systemData["-=value"] = null;
                delete systemData.value;
            }
        } else if (!isObject(item.system.price.value)) {
            item.system.price.value = CoinsPF2e.fromString(String(item.system.price.value)).toObject();
        }
    }
}

interface TreasureSystemOld extends TreasureSystemSource {
    denomination?: {
        value: "pp" | "gp" | "sp" | "cp";
    };
    value?: {
        value: number;
    };
    "-=denomination"?: null;
    "-=value"?: null;
}
