import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { Coins } from "@item/physical/data";
import { TreasureSystemSource } from "@item/treasure/data";
import { CoinsPF2e } from "@item/physical/helpers";
import { MigrationBase } from "../base";

export class Migration746StandardizePricing extends MigrationBase {
    static override version = 0.746;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (!isPhysicalData(item) && item.type !== "kit") return;

        if (typeof item.data.price === "string") {
            item.data.price = { value: CoinsPF2e.fromString(item.data.price).strip() };
        }

        if (item.type === "treasure") {
            const systemData: TreasureSystemOld = item.data;
            if (systemData.denomination || systemData.value) {
                const value = systemData.value?.value ?? 0;
                const denomination = systemData.denomination?.value ?? "gp";
                systemData.price = { value: { [denomination]: value } };

                systemData["-=denomination"] = null;
                delete systemData.denomination;
                systemData["-=value"] = null;
                delete systemData.value;
            }
        } else {
            const systemData: PhysicalDataOld = item.data;
            if (typeof systemData.price.value === "string") {
                systemData.price.value = CoinsPF2e.fromString(systemData.price.value).strip();
            }
        }
    }
}

interface PhysicalDataOld {
    price: {
        value: string | Coins;
    };
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
