import { ItemSourcePF2e } from "@item/data/index.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { Coins, PhysicalSystemSource } from "@item/physical/data.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Normalize stringy level and price values */
export class Migration639NormalizeLevelAndPrice extends MigrationBase {
    static override version = 0.639;

    private coinSlugs = new Set(["platinum-pieces", "gold-pieces", "silver-pieces", "copper-pieces"]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.system.level) {
            source.system.level.value = Number(source.system.level.value) || 0;
        }

        if (!isPhysicalData(source) || this.coinSlugs.has(source.system.slug ?? "")) {
            return;
        }

        const system: PhysicalDataOld = source.system;
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
