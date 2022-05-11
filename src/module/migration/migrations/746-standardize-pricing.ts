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

        if (item.type === "treasure") {
            const systemData: TreasureSystemOld = item.data;
            if (systemData.denomination || systemData.value) {
                const value = systemData.value?.value ?? 0;
                const denomination = systemData.denomination?.value ?? "gp";
                systemData.price = { value: stripCoins({ [denomination]: value }) };

                systemData["-=denomination"] = null;
                delete systemData.denomination;
                systemData["-=value"] = null;
                delete systemData.value;
            }
        } else {
            const systemData: PhysicalDataOld = item.data;
            if (typeof systemData.price.value === "string") {
                const coins = coinStringToCoins(systemData.price.value);
                systemData.price.value = stripCoins(coins);
            }
        }
    }
}

function stripCoins(coins: Coins): Coins {
    for (const denomination of DENOMINATIONS) {
        if (coins[denomination] === 0) {
            delete coins[denomination];
        }
    }
    return coins;
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
