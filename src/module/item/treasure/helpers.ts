import type { ActorPF2e } from "@actor";
import type { PhysicalItemData } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { Coins, Price } from "@item/physical/data";

// Redefined to avoid cyclical reference
const DENOMINATIONS = ["cp", "sp", "gp", "pp"] as const;

export function coinValueInCopper(coins: Coins) {
    const { cp, sp, gp, pp } = mergeObject(noCoins(), coins);
    return cp + sp * 10 + gp * 100 + pp * 1000;
}

/** Convert a `Coins` object into a price string */
export function coinsToString(coins: Coins, { reduce = true }: { reduce?: boolean } = {}): string {
    if (DENOMINATIONS.every((denomination) => !coins[denomination])) {
        return "0 gp";
    }

    const DENOMINATIONS_REVERSED = [...DENOMINATIONS].reverse();

    if (reduce) {
        const denomination = DENOMINATIONS_REVERSED.reduce((highest, denomination) => {
            return coins[denomination] ? denomination : highest;
        });

        const pp = coins["pp"] ?? 0;
        const gp = pp * 10 + (coins["gp"] ?? 0);
        const sp = gp * 10 + (coins["sp"] ?? 0);
        const value = { pp, gp, sp, cp: coinValueInCopper(coins) }[denomination];
        return `${value} ${denomination}`;
    } else {
        const parts: string[] = [];
        for (const denomation of DENOMINATIONS_REVERSED) {
            if (coins[denomation]) {
                parts.push(`${coins[denomation]} ${denomation}`);
            }
        }

        return parts.join(", ");
    }
}

/**
 * always return a new copy
 */
export function noCoins(): Required<Coins> {
    return { pp: 0, gp: 0, sp: 0, cp: 0 };
}

export function combineCoins<A extends Coins, B extends Coins>(first: A, second: B): A & B {
    function addMaybe(a?: number, b?: number) {
        return a === undefined ? b : b === undefined ? a : a + b;
    }

    return {
        pp: addMaybe(first.pp, second.pp),
        gp: addMaybe(first.gp, second.gp),
        sp: addMaybe(first.sp, second.sp),
        cp: addMaybe(first.cp, second.cp),
    } as A & B;
}

export function coinStringToCoins(coinString: string, quantity = 1): Coins {
    // This requires preprocessing, as large gold values contain , for their value
    const priceTag = String(coinString).trim().replace(/,/g, "");
    return [...priceTag.matchAll(/(\d+)\s*([pgsc]p)/g)]
        .map((match) => {
            const [value, denomination] = match.slice(1, 3);
            const computedValue = (Number(value) || 0) * quantity;
            return { [denomination]: computedValue };
        })
        .reduce(combineCoins, noCoins());
}

export function multiplyCoins(coins: Coins, factor: number): Coins {
    const result = mergeObject(noCoins(), coins);
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

export function multiplyPrice(price: Price, factor: number): Coins {
    const per = Math.max(1, price.per ?? 1);
    return multiplyCoins(price.value, factor / per);
}

/**
 * Sums up all wealth of a character, not just the treasure, but all other equipment
 * @param items
 */
export function calculateTotalWealth(items: PhysicalItemData[]): Coins {
    items = game.user.isGM ? items : items.filter((i) => i.data.identification.status === "identified");
    return items
        .filter((itemData) => isPhysicalData(itemData))
        .map((item) => multiplyPrice(item.data.price, item.data.quantity))
        .reduce(combineCoins, noCoins());
}

export const coinCompendiumIds = {
    pp: "JuNPeK5Qm1w6wpb4",
    gp: "B6B7tBWJSqOBz5zz",
    sp: "5Ew82vBF9YfaiY9f",
    cp: "lzJ8AVhRcbFul5fh",
};

export async function sellAllTreasure(actor: ActorPF2e): Promise<void> {
    const treasureIds: string[] = [];
    const coins: Coins = actor.itemTypes.treasure
        .filter((item) => !item.isCoinage)
        .map((item): Coins => {
            treasureIds.push(item.id);
            return item.assetValue;
        })
        .reduce(combineCoins, noCoins());

    await actor.deleteEmbeddedDocuments("Item", treasureIds);
    await actor.addCoins(coins);
}
