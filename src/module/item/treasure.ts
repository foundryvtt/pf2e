/* global game */
import { groupBy, isBlank } from '../utils';

// FIXME: point this to the correct type afterwards
type ItemPlaceholder = any;
type ActorPlaceholder = any;

export interface Coins {
    pp: number;
    gp: number;
    sp: number;
    cp: number;
}

interface SoldItemData {
    treasureIds: string[];
    coins: Coins;
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

/**
 * Finds all non-coin treasures in a list of items
 * @return {{treasureIds: Array, coins: Object}} List of treasures to remove and coins to add
 */
export function sellAllTreasure(items: ItemPlaceholder[]): SoldItemData {
    const treasureIds = [];
    const coins: Coins = items
        .filter(
            (item) =>
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
    return { treasureIds, coins };
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
function extractPriceFromItem(item: ItemPlaceholder): Coins {
    // This requires preprocessing, as large gold values contain , for their value
    const priceTag = item.data?.price?.value?.toString()?.trim()?.replace(/,/g, '') ?? '';
    const regex = /^(\d+)(?:\s*)(pp|gp|sp|cp)$/;
    if (regex.test(priceTag)) {
        const [, value, denomination] = priceTag.match(regex);
        const quantity = parseInt(item.data?.quantity?.value ?? '0', 10);
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
function calculateWealthForCategory(items: ItemPlaceholder[], category: string): Coins {
    if (category === 'treasure') {
        return calculateValueOfTreasure(items);
    } else {
        return items
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
export function calculateTotalWealth(items: ItemPlaceholder[]): Coins {
    const itemTypes = ['weapon', 'armor', 'equipment', 'consumable', 'treasure', 'backpack'];

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
export function calculateValueOfCurrency(items: ItemPlaceholder[]) {
    return items
        .filter(
            (item) =>
                item.data?.stackGroup?.value === 'coins' &&
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
 * Sums up all treasures in an actor's inventory
 * @param items
 * @return {*}
 */
export function calculateWealth(items: ItemPlaceholder[]): Coins {
    return calculateWealthForCategory(items, 'treasure');
}

export const coinCompendiumIds = {
    pp: 'JuNPeK5Qm1w6wpb4',
    gp: 'B6B7tBWJSqOBz5zz',
    sp: '5Ew82vBF9YfaiY9f',
    cp: 'lzJ8AVhRcbFul5fh',
};

function isTopLevelCoin(item: ItemPlaceholder, currencies: Set<string>): boolean {
    return (
        item?.type === 'treasure' &&
        item?.data?.value?.value === 1 &&
        item?.data?.stackGroup?.value === 'coins' &&
        isBlank(item?.data?.containerId?.value) &&
        currencies.has(item?.data?.denomination?.value)
    );
}

interface AddCoinsParameters {
    items?: ItemPlaceholder[];
    coins?: Coins;
    combineStacks?: boolean;
    updateItemQuantity?: (item: ItemPlaceholder, quantity: number) => Promise<void>;
    addFromCompendium?: (compendiumId: string, quantity: number) => Promise<void>;
}

export async function addCoins({
    items = [],
    coins = {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    },
    combineStacks = false,
    updateItemQuantity = async () => Promise.resolve(),
    addFromCompendium = async () => Promise.resolve(),
}: AddCoinsParameters = {}): Promise<void> {
    const currencies = new Set(Object.keys(coins));
    const topLevelCoins = items.filter((item) => combineStacks && isTopLevelCoin(item, currencies));
    const coinsByDenomination = groupBy(topLevelCoins, (item) => item?.data?.denomination?.value);

    for (const denomination of currencies) {
        const quantity = coins[denomination];
        if (quantity > 0) {
            if (coinsByDenomination.has(denomination)) {
                // eslint-disable-next-line no-await-in-loop
                await updateItemQuantity(coinsByDenomination.get(denomination)[0], quantity);
            } else {
                const compendiumId = coinCompendiumIds[denomination];
                // eslint-disable-next-line no-await-in-loop
                await addFromCompendium(compendiumId, quantity);
            }
        }
    }
}

export function addCoinsSimple(
    actor: ActorPlaceholder,
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
    return addCoins({
        coins,
        combineStacks,
        items: actor.data.items,
        async updateItemQuantity(item, quantity) {
            const currentQuantity = item?.data?.quantity?.value || 0;
            const ownedItem = actor.getOwnedItem(item._id);
            await ownedItem.update({ 'data.quantity.value': currentQuantity + quantity });
        },
        async addFromCompendium(compendiumId, quantity) {
            const pack = game.packs.find((p) => p.collection === 'pf2e.equipment-srd');
            const item = await pack.getEntity(compendiumId);
            item.data.data.quantity.value = quantity;
            await actor.createOwnedItem(item.data);
        },
    });
}

interface RemoveCoinsParameters {
    items?: ItemPlaceholder[];
    coins?: Coins;
    owner?: ActorPlaceholder;
    updateItemQuantity?: (item: ItemPlaceholder, quantity: number, actor: ActorPlaceholder) => Promise<void>;
}

export async function removeCoins({
    items = [],
    coins = {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    },
    owner,
    updateItemQuantity = async () => Promise.resolve(),
}: RemoveCoinsParameters = {}): Promise<void> {
    const currencies = new Set(Object.keys(coins));
    const topLevelCoins = items.filter((item) => isTopLevelCoin(item, currencies));
    const coinsByDenomination = groupBy(topLevelCoins, (item) => item?.data?.denomination?.value);
    for (const denomination of currencies) {
        const quantity = coins[denomination];
        if (quantity > 0) {
            if (coinsByDenomination.has(denomination)) {
                // eslint-disable-next-line no-await-in-loop
                await updateItemQuantity(coinsByDenomination.get(denomination), quantity, owner);
            }
        }
    }
}

export function removeCoinsSimple(
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
    return removeCoins({
        coins,
        items: actor.data.items,
        owner: actor,
        async updateItemQuantity(item, quantityToRemove, owner) {
            const entitiesToDelete = [];
            for (let x = 0; x < item.length && quantityToRemove > 0; x++) {
                const currentQuantity = item[x]?.data?.quantity?.value || 0;
                if (currentQuantity > quantityToRemove) {
                    owner
                        .getOwnedItem(item[x]._id)
                        .update({ 'data.quantity.value': currentQuantity - quantityToRemove });
                    quantityToRemove = 0;
                } else {
                    entitiesToDelete.push(item[x]._id);
                    quantityToRemove -= currentQuantity;
                }
            }
            if (entitiesToDelete.length > 0) {
                owner.deleteEmbeddedEntity('OwnedItem', entitiesToDelete);
            }
            if (quantityToRemove > 0) {
                console.warn('Attempted to remove more coinage than exists');
            }
        },
    });
}

export function sellAllTreasureSimple(actor: ActorPlaceholder): Promise<void[]> {
    const { treasureIds, coins } = sellAllTreasure(actor.data.items);
    return Promise.all([
        actor.deleteEmbeddedEntity('OwnedItem', treasureIds),
        addCoinsSimple(actor, {
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
        await actor.deleteEmbeddedEntity('OwnedItem', itemId);
        await addCoinsSimple(actor, {
            coins,
            combineStacks: true,
        });
    }
}

/**
 * Attempts to remove coins from an actor by total value regardless of cointype
 * @param actor
 * @param coinsToRemove
 * @return {Promise}<boolean> Resolves after the treasure is either removed (true) or determined to be insufficient and no change made (false)
 */
export async function attemptToRemoveCoinsByValue({
    actor,
    coinsToRemove,
}: {
    actor: ActorPlaceholder;
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
        await addCoinsSimple(actor, { coins: coinsToAdd });
    }
    await removeCoinsSimple(actor, { coins: coinsToRemove });
    return true;
}
