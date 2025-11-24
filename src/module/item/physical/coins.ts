import type { Size } from "@module/data.ts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import type { PartialPrice, RawCoins } from "./data.ts";
import type { CoinDenomination } from "./types.ts";
import { DENOMINATION_RATES, DENOMINATIONS } from "./values.ts";

/** Coins class that exposes methods to perform operations on coins without side effects */
class Coins implements RawCoins {
    declare cp: number;
    declare sp: number;
    declare gp: number;
    declare pp: number;

    /**
     * What unit to show in toString() if the value is 0 and units is "raw".
     * This is used to maintain "0 cp" in certain min price situations like the compendium browser.
     */
    #givenUnit: CoinDenomination | null;

    constructor(data?: RawCoins | number | null) {
        this.#givenUnit = R.isObjectType(data) ? R.keys(data)[0] : null;
        const object = typeof data === "number" ? { cp: data } : (data ?? {});
        for (const denomination of DENOMINATIONS) {
            this[denomination] = Math.max(Math.floor(Math.abs(object[denomination] ?? 0)), 0);
        }
    }

    get credits(): number {
        return this.sp;
    }

    set credits(value: number) {
        this.sp = value;
    }

    /** The total value of this coins in copper */
    get copperValue(): number {
        const { cp, sp, gp, pp } = this;
        return cp + sp * 10 + gp * 100 + pp * 1000;
    }

    get goldValue(): number {
        return this.copperValue / 100;
    }

    plus(coins: RawCoins): Coins {
        const other = new Coins(coins);
        return new Coins({
            pp: this.pp + other.pp,
            gp: this.gp + other.gp,
            sp: this.sp + other.sp,
            cp: this.cp + other.cp,
        });
    }

    /** Multiply by a number and clean up result */
    scale(factor: number): Coins {
        const result = new Coins(this);
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
    adjustForSize(size: Size): Coins {
        const basePrice = new Coins(this);

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
    toObject(): RawCoins {
        return DENOMINATIONS.reduce((result, denomination) => {
            if (this[denomination] !== 0) {
                return { ...result, [denomination]: this[denomination] };
            }
            return result;
        }, {});
    }

    /** Parses a price string such as "5 gp" and returns a new CoinsPF2e object */
    static fromString(coinString: string, quantity = 1): Coins {
        if (/^\s*\d+\s*$/.test(coinString)) {
            const denomination = SYSTEM_ID === "pf2e" ? "gp" : "sp";
            coinString = `${coinString.trim()} ${denomination}`;
        }

        // This requires preprocessing, as large gold values contain , for their value
        const priceTag = [...DENOMINATIONS, "credits"].reduce(
            (s, denomination) => {
                const localizedDenomination = game.i18n.localize(`PF2E.CurrencyAbbreviations.${denomination}`);
                if (localizedDenomination === denomination) return s;
                // This matches localized denomination if it's not followed or preceeded by an unicode letter character
                const pattern = new RegExp(`(?!<\\p{L})${localizedDenomination}(?!\\p{L})`, "u");
                return s.replace(pattern, denomination);
            },
            coinString.trim().replace(/,/g, ""),
        );

        // We add to raw coins so that the base unit works if rendering with "raw"
        const result: RawCoins = {};
        for (const match of priceTag.matchAll(/(\d+)\s*([pgsc]p|credits)/g)) {
            const [value, denominationRaw] = match.slice(1, 3);
            const denomination = denominationRaw === "credits" ? "sp" : denominationRaw;
            const computedValue = (Number(value) || 0) * quantity;
            if (tupleHasValue(DENOMINATIONS, denomination)) {
                result[denomination] = computedValue;
            }
        }
        return new Coins(result);
    }

    static fromPrice(price: PartialPrice, factor: number): Coins {
        const per = Math.max(1, price.per ?? 1);
        return new Coins(price.value).scale(factor / per);
    }

    /** Creates a new price string such as "5 gp" from this object */
    toString({ short = false, unit = "primary", decimal = false }: CoinStringParams = {}): string {
        // Convert system denomination to gp/credits. This is a single value display
        const normalize = unit === "primary";

        if (tupleHasValue(DENOMINATIONS, unit) || (SYSTEM_ID === "pf2e" && unit === "primary" && decimal)) {
            const denomination = unit === "primary" ? "gp" : unit;
            const divider = DENOMINATION_RATES[denomination];
            const value = this.copperValue / divider;
            const unitLabel = game.i18n.localize(`PF2E.CurrencyAbbreviations.${denomination}`);
            return `${decimal ? value.toFixed(2) : value} ${unitLabel}`;
        } else if (SYSTEM_ID === "sf2e" || unit === "credits") {
            const value = Math.ceil(this.copperValue / 10);
            return short ? String(value) : `${value} ${game.i18n.localize("PF2E.CurrencyAbbreviations.credits")}`;
        }

        // Simplify to GP if normalization is enabled
        const coins = normalize ? new Coins({ cp: this.copperValue }) : this;
        if (normalize) {
            coins.sp += Math.floor(coins.cp / 10);
            coins.cp = coins.cp % 10;
            coins.gp = Math.floor(coins.sp / 10);
            coins.sp = coins.sp % 10;
        }

        // Return 0 in the default denomination if there's nothing
        if (DENOMINATIONS.every((denomination) => !coins[denomination])) {
            const zeroUnit = (unit === "raw" ? this.#givenUnit : null) ?? (SYSTEM_ID === "pf2e" ? "gp" : "credits");
            return `0 ${game.i18n.localize(`PF2E.CurrencyAbbreviations.${zeroUnit}`)}`;
        }

        // Display all denomations from biggest to smallest (see Adventurer's Pack)
        const parts: string[] = [];
        for (const partialDenom of DENOMINATIONS) {
            const value = coins[partialDenom];
            const unitLabel = game.i18n.localize(`PF2E.CurrencyAbbreviations.${partialDenom}`);
            if (value) parts.push(`${value} ${unitLabel}`);
        }

        return parts.join(", ");
    }
}

interface CoinStringParams {
    /** If true, indicates that space is limited. This omits displaying "credits" in sf2e */
    short?: boolean;
    /**
     * Shows the value in a specific unit, or a special type. The special types are:
     * - raw: shows the exact contained values without conversion
     * - primary: normalizes to gp in pf2e or credits in sf2e.
     *   If the system is pf2e and decimals is false, then 5 sp will be shown as 5 sp, but 50 sp will be shown as 5 gp.
     */
    unit?: CoinDenomination | "credits" | "primary" | "raw";
    /** If enabled, the result is shown with decimals regardless of value, unless its credits */
    decimal?: boolean;
}

export { Coins };
