import { Size } from "@module/data.ts";
import { Coins, PartialPrice } from "./data.ts";
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

    plus(coins: Coins): CoinsPF2e {
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
        if (/^\s*\d+\s*$/.test(coinString)) coinString = `${coinString.trim()} gp`;

        // This requires preprocessing, as large gold values contain , for their value
        const priceTag = DENOMINATIONS.reduce(
            (s, denomination) => {
                const localizedDenomination = game.i18n.localize(`PF2E.CurrencyAbbreviations.${denomination}`);
                if (localizedDenomination === denomination) return s;
                // This matches localized denomination if it's not followed or preceeded by an unicode letter character
                const pattern = new RegExp(`(?!<\\p{L})${localizedDenomination}(?!\\p{L})`, "u");
                return s.replace(pattern, denomination);
            },
            coinString.trim().replace(/,/g, ""),
        );
        return [...priceTag.matchAll(/(\d+)\s*([pgsc]p)/g)]
            .map((match) => {
                const [value, denomination] = match.slice(1, 3);
                const computedValue = (Number(value) || 0) * quantity;
                return { [denomination]: computedValue };
            })
            .reduce((first, second) => first.plus(second), new CoinsPF2e());
    }

    static fromPrice(price: PartialPrice, factor: number): CoinsPF2e {
        const per = Math.max(1, price.per ?? 1);
        return new CoinsPF2e(price.value).scale(factor / per);
    }

    /** Creates a new price string such as "5 gp" from this object */
    toString(): string {
        if (DENOMINATIONS.every((denomination) => !this[denomination])) {
            return `0 ${game.i18n.localize("PF2E.CurrencyAbbreviations.gp")}`;
        }

        const DENOMINATIONS_REVERSED = [...DENOMINATIONS].reverse();
        const parts: string[] = [];
        for (const denomination of DENOMINATIONS_REVERSED) {
            if (this[denomination]) {
                parts.push(`${this[denomination]} ${game.i18n.localize(`PF2E.CurrencyAbbreviations.${denomination}`)}`);
            }
        }

        return parts.join(", ");
    }
}

const coinCompendiumIds = {
    pp: "JuNPeK5Qm1w6wpb4",
    gp: "B6B7tBWJSqOBz5zz",
    sp: "5Ew82vBF9YfaiY9f",
    cp: "lzJ8AVhRcbFul5fh",
};

export { coinCompendiumIds, CoinsPF2e };
