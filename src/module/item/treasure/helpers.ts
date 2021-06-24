import type { ActorPF2e } from '@actor/index';
import { groupBy } from '@module/utils';
import type { ItemDataPF2e, ItemType, PhysicalItemData, TreasureData } from '@item/data';
import type { PhysicalItemPF2e } from '@item/index';
import { isPhysicalData } from '@item/data/helpers';

export const DENOMINATIONS = ['cp', 'sp', 'gp', 'pp'] as const;

export interface Coins {
    pp: number;
    gp: number;
    sp: number;
    cp: number;
}

export function coinValueInCopper(coins: Coins) {
    return coins.cp + coins.sp * 10 + coins.gp * 100 + coins.pp * 1000;
}

/** Convert a `Coins` object into a price string */
export function coinsToString(coins: Coins): string {
    if (DENOMINATIONS.every((denomination) => coins[denomination] === 0)) {
        return '0 gp';
    }

    const denomination = DENOMINATIONS.reduce((highest, denomination) => {
        return coins[denomination] > 0 ? denomination : highest;
    });

    const value = {
        pp: coins['pp'],
        gp: coins['pp'] * 10 + coins['gp'],
        sp: coins['pp'] * 100 + coins['gp'] * 10 + coins['sp'],
        cp: coinValueInCopper(coins),
    }[denomination];

    return `${value} ${denomination}`;
}

export function toCoins(denomination: string, value: number): Coins {
    return {
        pp: denomination === 'pp' ? value : 0,
        gp: denomination === 'gp' ? value : 0,
        sp: denomination === 'sp' ? value : 0,
        cp: denomination === 'cp' ? value : 0,
    };
}

/**
 * always return a new copy
 */
function noCoins(): Coins {
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
                itemData.type === 'treasure' &&
                itemData?.data?.denomination?.value !== undefined &&
                itemData?.data?.denomination?.value !== null,
        )
        .map((item) => {
            const value = (item.data?.value?.value ?? 1) * (item.data?.quantity?.value ?? 1);
            return toCoins(item.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());
}

/**
 * Converts the price of an item to the Coin structure
 * @param itemData
 */
export function extractPriceFromItem(
    itemData: { data: { price: { value: string }; quantity: { value: number } } },
    quantity: number = itemData.data.quantity.value,
): Coins {
    // This requires preprocessing, as large gold values contain , for their value
    const priceTag = String(itemData.data.price.value).trim().replace(/,/g, '');
    const match = /^(\d+)\s*([pgsc]p)$/.exec(priceTag);
    if (match) {
        const [value, denomination] = match.slice(1, 3);
        return toCoins(denomination, (Number(value) || 0) * quantity);
    } else {
        return toCoins('gp', 0);
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
            isPhysicalData(itemData) && (game.user.isGM || itemData.data.identification.status === 'identified'),
    );
    if (category === 'treasure') {
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
    const itemTypes = ['weapon', 'armor', 'equipment', 'consumable', 'treasure', 'backpack'] as const;

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
                item.type === 'treasure' &&
                item.data.stackGroup?.value === 'coins' &&
                item.data.denomination?.value !== undefined &&
                item.data.denomination?.value !== null,
        )
        .map((item) => {
            const value = (Number(item.data.value.value) || 0) * item.data.quantity.value;
            return toCoins(item.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());
}

/**
 * Sums up all treasures in an actor's inventory
 * @param items
 */
export function calculateWealth(items: ItemDataPF2e[]): Coins {
    const treasureData = items.filter((itemData): itemData is TreasureData => itemData.type === 'treasure');
    return calculateWealthForCategory(treasureData, 'treasure');
}

export const coinCompendiumIds = {
    pp: 'JuNPeK5Qm1w6wpb4',
    gp: 'B6B7tBWJSqOBz5zz',
    sp: '5Ew82vBF9YfaiY9f',
    cp: 'lzJ8AVhRcbFul5fh',
};

function isTopLevelCoin(itemData: PhysicalItemData, currencies: typeof CURRENCIES): boolean {
    return (
        itemData.type === 'treasure' &&
        itemData.data.value.value === 1 &&
        itemData.data.stackGroup.value === 'coins' &&
        itemData.data.containerId.value === null &&
        currencies.has(itemData.data.denomination?.value)
    );
}

async function addFromCompendium(actor: ActorPF2e, compendiumId: string, quantity: number) {
    const pack = game.packs.find<CompendiumCollection<PhysicalItemPF2e>>((p) => p.collection === 'pf2e.equipment-srd');
    if (!pack) {
        throw Error('unable to get pack!');
    }
    const item = await pack.getDocument(compendiumId);
    if (item?.data.type === 'treasure') {
        item.data.update({ 'data.quantity.value': quantity });
        await actor.createEmbeddedDocuments('Item', [item.toObject()]);
    }
}

async function increaseItemQuantity(item: Embedded<PhysicalItemPF2e>, quantity: number) {
    if (item.data.type === 'treasure') {
        await item.update({ 'data.quantity.value': item.quantity + quantity });
    }
}

async function decreaseItemQuantity(items: Embedded<PhysicalItemPF2e>[], quantityToRemove: number) {
    const itemsToDelete: Embedded<PhysicalItemPF2e>[] = [];
    for await (const item of items) {
        if (quantityToRemove === 0) break;
        const currentQuantity = item.quantity;
        if (item.quantity > quantityToRemove) {
            await item.update({ 'data.quantity.value': currentQuantity - quantityToRemove });
            break;
        } else {
            itemsToDelete.push(item);
            quantityToRemove -= currentQuantity;
        }
    }
    if (itemsToDelete.length > 0) {
        const actor = itemsToDelete[0].parent;
        await actor.deleteEmbeddedDocuments(
            'Item',
            itemsToDelete.map((item) => item.id),
        );
    }
    if (quantityToRemove > 0) {
        console.warn('Attempted to remove more coinage than exists');
    }
}

const CURRENCIES = new Set(['pp', 'gp', 'sp', 'cp'] as const);

export async function addCoins(
    actor: ActorPF2e,
    {
        coins = {
            pp: 0,
            gp: 0,
            sp: 0,
            cp: 0,
        },
        combineStacks = false,
    }: { coins?: Coins; combineStacks?: boolean } = {},
): Promise<void> {
    const topLevelCoins = actor.itemTypes.treasure.filter(
        (item) => combineStacks && isTopLevelCoin(item.data, CURRENCIES),
    );
    const coinsByDenomination = groupBy(
        topLevelCoins,
        (item) => item.data.type === 'treasure' && item.data.data.denomination.value,
    );

    for await (const denomination of CURRENCIES) {
        const quantity = coins[denomination];
        if (quantity > 0) {
            const coins = coinsByDenomination.get(denomination)?.[0];
            if (coins) {
                await increaseItemQuantity(coins, quantity);
            } else {
                const compendiumId = coinCompendiumIds[denomination];
                await addFromCompendium(actor, compendiumId, quantity);
            }
        }
    }
}

export async function removeCoins(
    actor: ActorPF2e,
    {
        coins = {
            pp: 0,
            gp: 0,
            sp: 0,
            cp: 0,
        },
    }: { coins?: Coins; combineStacks?: boolean } = {},
): Promise<void> {
    const items = actor.itemTypes.treasure;
    const topLevelCoins = items.filter((item) => isTopLevelCoin(item.data, CURRENCIES));
    const coinsByDenomination = groupBy(topLevelCoins, (item) => item.data.data.denomination.value);
    for await (const denomination of CURRENCIES) {
        const quantity = coins[denomination];
        if (quantity > 0) {
            const coins = coinsByDenomination.get(denomination);
            if (coins) {
                await decreaseItemQuantity(coins, quantity);
            }
        }
    }
}

export async function sellAllTreasure(actor: ActorPF2e): Promise<void> {
    const treasureIds: string[] = [];
    const coins: Coins = actor.itemTypes.treasure
        .filter(
            (item) =>
                item.data.data.denomination.value !== undefined &&
                item.data.data.denomination.value !== null &&
                item.data.data.stackGroup.value !== 'coins',
        )
        .map((item): Coins => {
            treasureIds.push(item.id);
            const value = (item.data.data.value.value ?? 1) * (item.quantity ?? 1);
            return toCoins(item.data.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());

    await actor.deleteEmbeddedDocuments('Item', treasureIds);
    await addCoins(actor, { coins, combineStacks: true });
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
        item?.data.type === 'treasure' &&
        item.data.data.denomination.value !== undefined &&
        item.data.data.denomination.value !== null &&
        item.data.data.stackGroup.value !== 'coins'
    ) {
        const quantity = (item.data.data.value.value ?? 1) * (item.quantity ?? 1);
        const coins = toCoins(item.data.data.denomination.value, quantity);
        await item.delete();
        await addCoins(actor, {
            coins,
            combineStacks: true,
        });
    }
}

/**
 * Attempts to remove coins from an actor by total value regardless of cointype
 * @param actor
 * @param coinsToRemove
 * @return Resolves after the treasure is either removed (true) or determined to be insufficient and no change made (false)
 */
export async function attemptToRemoveCoinsByValue({
    actor,
    coinsToRemove,
}: {
    actor: ActorPF2e;
    coinsToRemove: Coins;
}): Promise<boolean> {
    const items = actor.items.map((item) => item.data);
    const actorCoins = calculateValueOfCurrency(items);
    //  Convert actorCoins and coinsToRemove to copper to facilitate comparison
    const actorCoinsCopper = actorCoins.cp + actorCoins.sp * 10 + actorCoins.gp * 100 + actorCoins.pp * 1000;
    let valueToRemoveInCopper =
        coinsToRemove.cp + coinsToRemove.sp * 10 + coinsToRemove.gp * 100 + coinsToRemove.pp * 1000;
    //  Error if total is not sufficient, will not be possible to construct a valid new coinsToRemove
    if (valueToRemoveInCopper > actorCoinsCopper) {
        return false;
    }
    const coinsToAdd = {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    };
    let coinsBroken = false;
    //  Choose quantities of each coin to remove from smallest to largest to ensure we don't end in a situation where we need to break a coin that has already been "removed"
    if (valueToRemoveInCopper % 10 > actorCoins.cp) {
        coinsToAdd.cp = 10;
        coinsToRemove.cp = valueToRemoveInCopper % 10;
        valueToRemoveInCopper += 10 - coinsToRemove.cp;
        coinsBroken = true;
    } else {
        coinsToRemove.cp = valueToRemoveInCopper % 10; //  remove the units that other coins can't handle first
        valueToRemoveInCopper -= coinsToRemove.cp;
        actorCoins.cp -= coinsToRemove.cp;
        const extraCopper = Math.min(valueToRemoveInCopper / 10, Math.trunc(actorCoins.cp / 10)) * 10;
        coinsToRemove.cp += extraCopper;
        valueToRemoveInCopper -= extraCopper;
    }

    if ((valueToRemoveInCopper / 10) % 10 > actorCoins.sp) {
        coinsToAdd.sp = 10;
        coinsToRemove.sp = (valueToRemoveInCopper / 10) % 10;
        valueToRemoveInCopper += 100 - coinsToRemove.sp * 10;
        coinsBroken = true;
    } else {
        coinsToRemove.sp = (valueToRemoveInCopper / 10) % 10; //  remove the units that other coins can't handle first
        valueToRemoveInCopper -= coinsToRemove.sp * 10;
        actorCoins.sp -= coinsToRemove.sp;
        const extraSilver = Math.min(valueToRemoveInCopper / 100, Math.trunc(actorCoins.sp / 10)) * 10;
        coinsToRemove.sp += extraSilver;
        valueToRemoveInCopper -= extraSilver * 10;
    }

    if ((valueToRemoveInCopper / 100) % 10 > actorCoins.gp) {
        coinsToAdd.gp = 10;
        coinsToRemove.gp = (valueToRemoveInCopper / 100) % 10;
        valueToRemoveInCopper += 1000 - coinsToRemove.gp * 100;
        coinsBroken = true;
    } else {
        coinsToRemove.gp = (valueToRemoveInCopper / 100) % 10; //  remove the units that other coins can't handle first
        valueToRemoveInCopper -= coinsToRemove.gp * 100;
        actorCoins.gp -= coinsToRemove.gp;
        const extraGold = Math.min(valueToRemoveInCopper / 1000, Math.trunc(actorCoins.gp / 10)) * 10;
        coinsToRemove.gp += extraGold;
        valueToRemoveInCopper -= extraGold * 100;
    }

    coinsToRemove.pp = valueToRemoveInCopper / 1000;

    if (coinsBroken) {
        await addCoins(actor, { coins: coinsToAdd });
    }
    await removeCoins(actor, { coins: coinsToRemove });
    return true;
}
