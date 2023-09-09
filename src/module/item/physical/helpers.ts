import { Coins, PartialPrice } from "@item/physical/data.ts";
import { Rarity, Size } from "@module/data.ts";
import * as R from "remeda";
import { Bulk } from "./bulk.ts";
import type { PhysicalItemPF2e } from "./document.ts";
import { getMaterialValuationData } from "./materials.ts";
import { getRunesValuationData } from "./runes.ts";
import { DENOMINATIONS } from "./values.ts";

/** Coins class that exposes methods to perform operations on coins without side effects */
class CoinsPF2e implements Coins {
    declare cp: number;
    declare sp: number;
    declare gp: number;
    declare pp: number;

    constructor(data?: Coins | null) {
        data ??= {};
        for (const denomination of DENOMINATIONS) {
            this[denomination] = Math.max(Math.floor(Math.abs(data[denomination] ?? 0)), 0);
        }
    }

    /** The total value of this coins in copper */
    get copperValue(): number {
        const { cp, sp, gp, pp } = this;
        return cp + sp * 10 + gp * 100 + pp * 1000;
    }

    get goldValue(): number {
        return this.copperValue / 100;
    }

    add(coins: Coins): CoinsPF2e {
        const other = new CoinsPF2e(coins);
        return new CoinsPF2e({
            pp: this.pp + other.pp,
            gp: this.gp + other.gp,
            sp: this.sp + other.sp,
            cp: this.cp + other.cp,
        });
    }

    /** Multiply by a number and clean up result */
    scale(factor: number): CoinsPF2e {
        const result = new CoinsPF2e(this);
        result.pp *= factor;
        result.gp *= factor;
        result.sp *= factor;
        result.cp *= factor;

        // If the factor is not a whole number, we will need to handle coin spillover
        if (factor % 1 !== 0) {
            result.gp += (result.pp % 1) * 10;
            result.sp += (result.gp % 1) * 10;
            result.cp += (result.sp % 1) * 10;

            // Some computations like 2.8 % 1 evaluate to 0.79999, so we can't just floor
            for (const denomination of DENOMINATIONS) {
                result[denomination] = Math.floor(Number(result[denomination].toFixed(1)));
            }
        }

        return result;
    }

    /** Increase a price for larger physical-item sizes */
    adjustForSize(size: Size): CoinsPF2e {
        const basePrice = new CoinsPF2e(this);

        switch (size) {
            case "lg": {
                return basePrice.scale(2);
            }
            case "huge": {
                return basePrice.scale(4);
            }
            case "grg": {
                return basePrice.scale(8);
            }
            default:
                return basePrice;
        }
    }

    /** Returns a coins data object with all zero value denominations omitted */
    toObject(): Coins {
        return DENOMINATIONS.reduce((result, denomination) => {
            if (this[denomination] !== 0) {
                return { ...result, [denomination]: this[denomination] };
            }
            return result;
        }, {});
    }

    /** Parses a price string such as "5 gp" and returns a new CoinsPF2e object */
    static fromString(coinString: string, quantity = 1): CoinsPF2e {
        // This requires preprocessing, as large gold values contain , for their value
        const priceTag = String(coinString).trim().replace(/,/g, "");
        return [...priceTag.matchAll(/(\d+)\s*([pgsc]p)/g)]
            .map((match) => {
                const [value, denomination] = match.slice(1, 3);
                const computedValue = (Number(value) || 0) * quantity;
                return { [denomination]: computedValue };
            })
            .reduce((first, second) => first.add(second), new CoinsPF2e());
    }

    static fromPrice(price: PartialPrice, factor: number): CoinsPF2e {
        const per = Math.max(1, price.per ?? 1);
        return new CoinsPF2e(price.value).scale(factor / per);
    }

    /** Creates a new price string such as "5 gp" from this object */
    toString(): string {
        if (DENOMINATIONS.every((denomination) => !this[denomination])) {
            return "0 gp";
        }

        const DENOMINATIONS_REVERSED = [...DENOMINATIONS].reverse();
        const parts: string[] = [];
        for (const denomation of DENOMINATIONS_REVERSED) {
            if (this[denomation]) {
                parts.push(`${this[denomation]} ${denomation}`);
            }
        }

        return parts.join(", ");
    }
}

function computePrice(item: PhysicalItemPF2e): CoinsPF2e {
    const basePrice = item.price.value;
    if (item.isOfType("treasure")) return basePrice;

    // Adjust the item price according to precious material and runes
    // Base prices are not included in these cases
    // https://2e.aonprd.com/Rules.aspx?ID=731
    // https://2e.aonprd.com/Equipment.aspx?ID=380
    const materialData = getMaterialValuationData(item);
    const materialPrice = materialData?.price ?? 0;
    const heldOrStowedBulk = new Bulk({ light: item.system.bulk.heldOrStowed });
    const bulk = Math.max(Math.ceil(heldOrStowedBulk.normal), 1);
    const materialValue = materialPrice + (bulk * materialPrice) / 10;

    const runesData = getRunesValuationData(item);
    const runeValue = item.isSpecific ? 0 : runesData.reduce((sum, rune) => sum + rune.price, 0);

    const afterMaterialAndRunes = runeValue
        ? new CoinsPF2e({ gp: runeValue + materialValue })
        : basePrice.add({ gp: materialValue });
    const higher = afterMaterialAndRunes.copperValue > basePrice.copperValue ? afterMaterialAndRunes : basePrice;
    const afterShoddy = item.isShoddy ? higher.scale(0.5) : higher;

    /** Increase the price if it is larger than medium and not magical. */
    return item.isMagical ? afterShoddy : afterShoddy.adjustForSize(item.size);
}

function computeLevelRarityPrice(item: PhysicalItemPF2e): { level: number; rarity: Rarity; price: CoinsPF2e } {
    // Stop here if this weapon is not a magical or precious-material item, or if it is a specific magic weapon
    const materialData = getMaterialValuationData(item);
    const price = computePrice(item);
    if (!(item.isMagical || materialData) || item.isSpecific) {
        return { ...R.pick(item, ["level", "rarity"]), price };
    }

    const runesData = getRunesValuationData(item);
    const level = runesData
        .map((runeData) => runeData.level)
        .concat(materialData?.level ?? 0)
        .reduce((highest, level) => (level > highest ? level : highest), item.level);

    const rarityOrder = {
        common: 0,
        uncommon: 1,
        rare: 2,
        unique: 3,
    };
    const baseRarity = item.rarity;
    const rarity = runesData
        .map((runeData) => runeData.rarity)
        .concat(materialData?.rarity ?? "common")
        .reduce((highest, rarity) => (rarityOrder[rarity] > rarityOrder[highest] ? rarity : highest), baseRarity);

    return { level, rarity, price };
}

const coinCompendiumIds = {
    pp: "JuNPeK5Qm1w6wpb4",
    gp: "B6B7tBWJSqOBz5zz",
    sp: "5Ew82vBF9YfaiY9f",
    cp: "lzJ8AVhRcbFul5fh",
};

export { CoinsPF2e, coinCompendiumIds, computeLevelRarityPrice };
