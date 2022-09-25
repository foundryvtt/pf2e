import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { Coins, PhysicalSystemSource } from "@item/physical/data";
import { CoinsPF2e } from "@item/physical/helpers";
import { isObject } from "@util";
import { MigrationBase } from "../base";

/** Normalize stringy level and price values */
export class Migration639NormalizeLevelAndPrice extends MigrationBase {
    static override version = 0.639;

    private coinSlugs = new Set(["platinum-pieces", "gold-pieces", "silver-pieces", "copper-pieces"]);

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if ("level" in itemData.system) {
            itemData.system.level.value = Number(itemData.system.level.value) || 0;
        }

        if (!isPhysicalData(itemData) || this.coinSlugs.has(itemData.system.slug ?? "")) {
            return;
        }

        const system: PhysicalDataOld = itemData.system;
        const price = system.price;

        // This is new data being run through an old migration, shouldn't happen but we should appease typescript
        if (typeof price.value !== "string" && isObject(price.value)) {
            return;
        }

        if (price.value) {
            price.value = price.value.trim();
        } else {
            price.value = "0 gp";
        }

        if (/^[0-9]+$/.test(price.value)) {
            price.value = `${price.value} gp`;
        } else {
            const quantity = system.quantity;
            const priceValue = price.value;
            if (CoinsPF2e.fromString(priceValue, quantity).copperValue) {
                price.value = "0 gp";
            }
        }
    }
}

interface PhysicalDataOld extends Omit<PhysicalSystemSource, "price"> {
    price: {
        value?: string | Coins;
    };
}
