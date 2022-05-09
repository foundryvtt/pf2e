import type { ActorPF2e } from "@actor";
import type { ItemDataPF2e, ItemType, PhysicalItemData, TreasureData } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";

export const DENOMINATIONS = ["cp", "sp", "gp", "pp"] as const;

export interface Coins {
    pp: number;
    gp: number;
    sp: number;
    cp: number;
}

export function coinValueInCopper(coins: Partial<Coins>) {
    const { cp, sp, gp, pp } = mergeObject(noCoins(), coins);
    return cp + sp * 10 + gp * 100 + pp * 1000;
}

/** Convert a `Coins` object into a price string */
export function coinsToString({ cp = 0, sp = 0, gp = 0, pp = 0 }: Partial<Coins>): string {
    const coins: Coins = { cp, sp, gp, pp };
    if (DENOMINATIONS.every((denomination) => coins[denomination] === 0)) {
        return "0 gp";
    }

    const denomination = [...DENOMINATIONS].reverse().reduce((highest, denomination) => {
        return coins[denomination] > 0 ? denomination : highest;
    });

    const value = {
        pp: coins["pp"],
        gp: coins["pp"] * 10 + coins["gp"],
        sp: coins["pp"] * 100 + coins["gp"] * 10 + coins["sp"],
        cp: coinValueInCopper(coins),
    }[denomination];

    return `${value} ${denomination}`;
}

export function toCoins(denomination: string, value: number): Coins {
    return {
        pp: denomination === "pp" ? value : 0,
        gp: denomination === "gp" ? value : 0,
        sp: denomination === "sp" ? value : 0,
        cp: denomination === "cp" ? value : 0,
    };
}

/**
 * always return a new copy
 */
export function noCoins(): Coins {
    return {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    };
}

export function combineCoins(first: Coins, second: Coins): Coins {
    return {
        pp: first.pp + second.pp,
        gp: first.gp + second.gp,
        sp: first.sp + second.sp,
        cp: first.cp + second.cp,
    };
}

/** \brief Sums up the value of all treasure in inventory
 *
 * @param items
 */
function calculateValueOfTreasure(items: PhysicalItemData[]) {
    return items
        .filter(
            (itemData): itemData is TreasureData =>
                itemData.type === "treasure" &&
                itemData?.data?.denomination?.value !== undefined &&
                itemData?.data?.denomination?.value !== null
        )
        .map((item) => {
            const value = (item.data?.value?.value ?? 1) * (item.data.quantity ?? 1);
            return toCoins(item.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());
}

/** Converts the price of an item to the Coin structure */
export function extractPriceFromItem(
    itemData: { data: { price: { value: string }; quantity?: number } },
    quantity = itemData.data.quantity ?? 1
): Coins {
    return coinStringToCoins(itemData.data.price.value, quantity);
}

export function coinStringToCoins(coinString: string, quantity = 1): Coins {
    // This requires preprocessing, as large gold values contain , for their value
    const priceTag = String(coinString).trim().replace(/,/g, "");
    return [...priceTag.matchAll(/(\d+)\s*([pgsc]p)/g)]
        .map((match) => {
            const [value, denomination] = match.slice(1, 3);
            return toCoins(denomination, (Number(value) || 0) * quantity);
        })
        .reduce(combineCoins, noCoins());
}

export function multiplyCoinValue(coins: Coins, factor: number): Coins {
    if (factor % 1 === 0) {
        return {
            pp: coins.pp * factor,
            gp: coins.gp * factor,
            sp: coins.sp * factor,
            cp: coins.cp * factor,
        };
    } else {
        const pp = coins.pp * factor;
        const gp = coins.gp * factor + (pp % 1) * 10;
        const sp = coins.sp * factor + (gp % 1) * 10;
        const cp = coins.cp * factor + (sp % 1) * 10;
        return {
            pp: Math.floor(pp),
            gp: Math.floor(gp),
            sp: Math.floor(sp),
            cp: Math.floor(cp),
        };
    }
}

/**
 * Utility function to be used with various categories
 * @param items
 * @param category
 */
function calculateWealthForCategory(items: ItemDataPF2e[], category: ItemType): Coins {
    const toCalculate = items.filter(
        (itemData): itemData is PhysicalItemData =>
            isPhysicalData(itemData) && (game.user.isGM || itemData.data.identification.status === "identified")
    );
    if (category === "treasure") {
        return calculateValueOfTreasure(toCalculate);
    } else {
        return toCalculate
            .filter((item) => item.type === category)
            .map((item) => {
                return extractPriceFromItem(item);
            })
            .reduce(combineCoins, noCoins());
    }
}

/**
 * Sums up all wealth of a character, not just the treasure, but all other equipment
 * @param items
 */
export function calculateTotalWealth(items: PhysicalItemData[]): Coins {
    items = game.user.isGM ? items : items.filter((i) => i.data.identification.status === "identified");
    const itemTypes = ["weapon", "armor", "equipment", "consumable", "treasure", "backpack"] as const;

    return itemTypes
        .map((itemType) => {
            return calculateWealthForCategory(items, itemType);
        })
        .reduce(combineCoins, noCoins());
}

/** \brief Sums up the value of all coins in an actor's inventory
 *
 * @param items
 */
export function calculateValueOfCurrency(items: ItemDataPF2e[]) {
    return items
        .filter(
            (item): item is TreasureData =>
                item.type === "treasure" &&
                item.data.stackGroup === "coins" &&
                item.data.denomination?.value !== undefined &&
                item.data.denomination?.value !== null
        )
        .map((item) => {
            const value = (Number(item.data.value.value) || 0) * item.data.quantity;
            return toCoins(item.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());
}

/**
 * Sums up all treasures in an actor's inventory
 * @param items
 */
export function calculateWealth(items: ItemDataPF2e[]): Coins {
    const treasureData = items.filter((itemData): itemData is TreasureData => itemData.type === "treasure");
    return calculateWealthForCategory(treasureData, "treasure");
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
        .filter(
            (item) =>
                item.data.data.denomination.value !== undefined &&
                item.data.data.denomination.value !== null &&
                item.data.data.stackGroup !== "coins"
        )
        .map((item): Coins => {
            treasureIds.push(item.id);
            const value = (item.data.data.value.value ?? 1) * (item.quantity ?? 1);
            return toCoins(item.data.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());

    await actor.deleteEmbeddedDocuments("Item", treasureIds);
    await actor.addCoins(coins);
}

/**
 * Converts a non-coin treasure in an actor's inventory to coinage
 * @param actor
 * @param itemId
 * @return Resolves after the treasure is removed and coins updated
 */
export async function sellTreasure(actor: ActorPF2e, itemId: string): Promise<void> {
    const item = actor.physicalItems.get(itemId);
    if (
        item?.data.type === "treasure" &&
        item.data.data.denomination.value !== undefined &&
        item.data.data.denomination.value !== null &&
        item.data.data.stackGroup !== "coins"
    ) {
        const quantity = (item.data.data.value.value ?? 1) * (item.quantity ?? 1);
        const coins = toCoins(item.data.data.denomination.value, quantity);
        await item.delete();
        await actor.addCoins(coins);
    }
}
