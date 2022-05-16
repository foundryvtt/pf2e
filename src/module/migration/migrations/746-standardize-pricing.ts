import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { Coins } from "@item/physical/data";
import { DENOMINATIONS } from "@item/physical/values";
import { TreasureSystemSource } from "@item/treasure/data";
import { coinStringToCoins } from "@item/treasure/helpers";
import { MigrationBase } from "../base";

export class Migration746StandardizePricing extends MigrationBase {
    static override version = 0.746;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (!isPhysicalData(item) && item.type !== "kit") return;

        if (typeof item.data.price === "string") {
            item.data.price = { value: coinStringToCoins(item.data.price) };
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
                systemData.price.value = coinStringToCoins(systemData.price.value);
            }
        }

        // strip all zero value denominations from the result
        if (item.data.price.value) {
            const coins = item.data.price.value;
            for (const denomination of DENOMINATIONS) {
                if (coins[denomination] === 0) {
                    delete coins[denomination];
                }
            }
        }
    }
}

interface PhysicalDataOld {
    price: {
        value: string | Partial<Coins>;
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
