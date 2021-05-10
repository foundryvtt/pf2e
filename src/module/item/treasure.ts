import { ActorPF2e } from '../actor/base';
import { groupBy, isBlank } from '../utils';
import { isPhysicalItem, ItemDataPF2e, ItemType, PhysicalItemData, TreasureData } from './data/types';
import { PhysicalItemPF2e } from './physical';

// FIXME: point this to the correct type afterwards
type ItemPlaceholder = any;
type ActorPlaceholder = any;

export interface Coins {
    pp: number;
    gp: number;
    sp: number;
    cp: number;
}

export function coinValueInCopper(coins: Coins) {
    return coins.cp + coins.sp * 10 + coins.gp * 100 + coins.pp * 1000;
}

function toCoins(denomination: string, value: number): Coins {
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

function combineCoins(first: Coins, second: Coins): Coins {
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
function calculateValueOfTreasure(items: ItemPlaceholder[]) {
    return items
        .filter(
            (item) =>
                item.type === 'treasure' &&
                item?.data?.denomination?.value !== undefined &&
                item?.data?.denomination?.value !== null,
        )
        .map((item) => {
            const value = (item.data?.value?.value ?? 1) * (item.data?.quantity?.value ?? 1);
            return toCoins(item.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());
}

/**
 * Converts the price of an item to the Coin structure
 * @param item
 */
export function extractPriceFromItem(item: PhysicalItemData, quantityOverride?: number): Coins {
    // This requires preprocessing, as large gold values contain , for their value
    const priceTag = item.data.price?.value?.toString()?.trim()?.replace(/,/g, '') ?? '';
    const regex = /^(\d+)(?:\s*)(pp|gp|sp|cp)$/;
    const match = regex.exec(priceTag);
    if (match) {
        const [value, denomination] = match.slice(1, 3);
        const quantity = quantityOverride ?? item.data.quantity.value;
        return toCoins(denomination, parseInt(value, 10) * quantity);
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
            isPhysicalItem(itemData) && (game.user.isGM || itemData.data.identification.status === 'identified'),
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

function isTopLevelCoin(item: ItemPlaceholder, currencies: typeof CURRENCIES): boolean {
    return (
        item?.type === 'treasure' &&
        item?.data?.value?.value === 1 &&
        item?.data?.stackGroup?.value === 'coins' &&
        isBlank(item?.data?.containerId?.value) &&
        currencies.has(item?.data?.denomination?.value)
    );
}

async function addFromCompendium(actor: ActorPlaceholder, compendiumId: string, quantity: number) {
    const pack = game.packs.find<Compendium<PhysicalItemPF2e>>((p) => p.collection === 'pf2e.equipment-srd');
    if (!pack) {
        throw Error('unable to get pack!');
    }
    const item = await pack.getEntity(compendiumId);
    if (item !== null && item.data.type === 'treasure') {
        item.data.data.quantity.value = quantity;
        await actor.createOwnedItem(item.data);
    }
}

async function increaseItemQuantity(actor: ActorPlaceholder, item: ItemPlaceholder, quantity: number) {
    const currentQuantity = item?.data?.quantity?.value || 0;
    const ownedItem = actor.getOwnedItem(item._id);
    if (ownedItem.data.type === 'treasure') {
        await ownedItem.update({ 'data.quantity.value': currentQuantity + quantity });
    }
}

async function decreaseItemQuantity(actor: ActorPlaceholder, item: ItemPlaceholder, quantityToRemove: number) {
    const entitiesToDelete: string[] = [];
    for (let x = 0; x < item.length && quantityToRemove > 0; x++) {
        const currentQuantity = item[x]?.data?.quantity?.value || 0;
        if (currentQuantity > quantityToRemove) {
            actor.getOwnedItem(item[x]._id).update({ 'data.quantity.value': currentQuantity - quantityToRemove });
            quantityToRemove = 0;
        } else {
            entitiesToDelete.push(item[x]._id);
            quantityToRemove -= currentQuantity;
        }
    }
    if (entitiesToDelete.length > 0) {
        await actor.deleteEmbeddedDocuments('Item', entitiesToDelete);
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
    const items: ItemPlaceholder[] = actor.data.items;
    const topLevelCoins = items.filter((item) => combineStacks && isTopLevelCoin(item, CURRENCIES));
    const coinsByDenomination = groupBy(topLevelCoins, (item) => item?.data?.denomination?.value);

    for await (const denomination of CURRENCIES) {
        const quantity = coins[denomination];
        if (quantity > 0) {
            if (coinsByDenomination.has(denomination)) {
                await increaseItemQuantity(actor, coinsByDenomination.get(denomination)![0], quantity);
            } else {
                const compendiumId = coinCompendiumIds[denomination];
                await addFromCompendium(actor, compendiumId, quantity);
            }
        }
    }
}

export async function removeCoins(
    actor: ActorPlaceholder,
    {
        coins = {
            pp: 0,
            gp: 0,
            sp: 0,
            cp: 0,
        },
    }: { coins?: Coins; combineStacks?: boolean } = {},
): Promise<void> {
    const items: ItemPlaceholder[] = actor.data.items;
    const topLevelCoins = items.filter((item) => isTopLevelCoin(item, CURRENCIES));
    const coinsByDenomination = groupBy(topLevelCoins, (item) => item?.data?.denomination?.value);
    for await (const denomination of CURRENCIES) {
        const quantity = coins[denomination];
        if (quantity > 0) {
            if (coinsByDenomination.has(denomination)) {
                await decreaseItemQuantity(actor, coinsByDenomination.get(denomination), quantity);
            }
        }
    }
}

export function sellAllTreasure(actor: ActorPlaceholder): Promise<void[]> {
    const treasureIds: string[] = [];
    const coins: Coins = actor.data.items
        .filter(
            (item: ItemPlaceholder) =>
                item.type === 'treasure' &&
                item.data?.denomination?.value !== undefined &&
                item.data?.denomination?.value !== null &&
                item?.data?.stackGroup?.value !== 'coins',
        )
        .map(
            (item: ItemPlaceholder): Coins => {
                treasureIds.push(item._id);
                const value = (item.data?.value?.value ?? 1) * (item.data?.quantity?.value ?? 1);
                return toCoins(item.data.denomination.value, value);
            },
        )
        .reduce(combineCoins, noCoins());

    return Promise.all([
        actor.deleteEmbeddedDocuments('Item', treasureIds),
        addCoins(actor, {
            coins,
            combineStacks: true,
        }),
    ]);
}

/**
 * Converts a non-coin treasure in an actor's inventory to coinage
 * @param actor
 * @param itemId
 * @return {Promise} Resolves after the treasure is removed and coins updated
 */
export async function sellTreasure(actor: ActorPlaceholder, itemId: string): Promise<void> {
    const item = actor.getOwnedItem(itemId);
    if (
        item?.type === 'treasure' &&
        item.data.data?.denomination?.value !== undefined &&
        item.data.data?.denomination?.value !== null &&
        item.data.data?.stackGroup?.value !== 'coins'
    ) {
        const quantity = (item.data.data?.value?.value ?? 1) * (item.data.data?.quantity?.value ?? 1);
        const coins = toCoins(item.data.data.denomination.value, quantity);
        await actor.deleteEmbeddedDocuments('Item', itemId);
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
    const items = actor.data.items || [];
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
