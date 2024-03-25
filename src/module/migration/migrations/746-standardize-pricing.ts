import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { TreasureSystemSource } from "@item/treasure/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration746StandardizePricing extends MigrationBase {
    static override version = 0.746;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical") && source.type !== "kit") return;

        if (!R.isObject(source.system.price)) {
            source.system.price = { value: CoinsPF2e.fromString(String(source.system.price)).toObject() };
        }

        if (source.type === "treasure") {
            const systemData: TreasureSystemOld = source.system;
            if (systemData.denomination || systemData.value) {
                const value = systemData.value?.value ?? 0;
                const denomination = systemData.denomination?.value ?? "gp";
                systemData.price = { value: { [denomination]: value } };

                systemData["-=denomination"] = null;
                delete systemData.denomination;
                systemData["-=value"] = null;
                delete systemData.value;
            }
        } else if (!R.isObject(source.system.price.value)) {
            source.system.price.value = CoinsPF2e.fromString(String(source.system.price.value)).toObject();
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
