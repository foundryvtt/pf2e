import {groupBy, isBlank} from '../utils';

// FIXME: point this to the correct type afterwards
type ItemPlaceholder = any;
type ActorPlaceholder = any;

interface Coins {
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
        .filter(item => item.type === 'treasure'
            && item.data?.denomination?.value !== undefined
            && item.data?.denomination?.value !== null
            && item?.data?.stackGroup?.value !== 'coins')
        .map((item: ItemPlaceholder): Coins => {
            treasureIds.push(item._id);
            const value = (item.data?.value?.value ?? 1) * (item.data?.quantity?.value ?? 1);
            return toCoins(item.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());
    return {treasureIds, coins};
}

/**
 * Sums up all treasures in an actor's inventory and fills the
 * @param items
 * @return {*}
 */
export function calculateWealth(items: ItemPlaceholder[]): Coins {
    return items
        .filter(item => item.type === 'treasure'
            && item?.data?.denomination?.value !== undefined
            && item?.data?.denomination?.value !== null)
        .map(item => {
            const value = (item.data?.value?.value ?? 1) * (item.data?.quantity?.value ?? 1);
            return toCoins(item.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());
}

export const coinCompendiumIds = {
    pp: 'JuNPeK5Qm1w6wpb4',
    gp: 'B6B7tBWJSqOBz5zz',
    sp: '5Ew82vBF9YfaiY9f',
    cp: 'lzJ8AVhRcbFul5fh',
};

function isTopLevelCoin(item: ItemPlaceholder, currencies: Set<string>): boolean {
    return item?.type === 'treasure'
        && item?.data?.value?.value === 1
        && item?.data?.stackGroup?.value === 'coins'
        && isBlank(item?.data?.containerId?.value)
        && currencies.has(item?.data?.denomination?.value);
}

interface AddCoinsParameters {
    items?: ItemPlaceholder[],
    coins?: Coins,
    combineStacks?: boolean,
    updateItemQuantity?: (item: ItemPlaceholder, quantity: number) => Promise<void>,
    addFromCompendium?: (compendiumId: string, quantity: number) => Promise<void>,
}

export async function addCoins(
    {
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
    }: AddCoinsParameters = {},
): Promise<void> {
    const currencies = new Set(Object.keys(coins));
    const topLevelCoins = items
        .filter(item => combineStacks && isTopLevelCoin(item, currencies));
    const coinsByDenomination = groupBy(topLevelCoins, item => item?.data?.denomination?.value);

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

export function addCoinsSimple(actor: ActorPlaceholder, {
    coins = {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    },
    combineStacks = false,
}: { coins?: Coins, combineStacks?: boolean } = {}): Promise<void> {
    return addCoins({
        coins,
        combineStacks,
        items: actor.data.items,
        async updateItemQuantity(item, quantity) {
            const currentQuantity = item?.data?.quantity?.value || 0;
            const ownedItem = actor.getOwnedItem(item._id);
            await ownedItem.update({'data.quantity.value': currentQuantity + quantity});
        },
        async addFromCompendium(compendiumId, quantity) {
            const pack = game.packs.find(p => p.collection === 'pf2e.equipment-srd');
            const item = await pack.getEntity(compendiumId);
            item.data.data.quantity.value = quantity;
            await actor.createOwnedItem(item.data);
        },
    });
}

export function sellAllTreasureSimple(actor: ActorPlaceholder): Promise<void[]> {
    const {treasureIds, coins} = sellAllTreasure(actor.data.items);
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
    if (item?.type === 'treasure'
        && item.data.data?.denomination?.value !== undefined
        && item.data.data?.denomination?.value !== null
        && item.data.data?.stackGroup?.value !== 'coins') {
        const quantity = (item.data.data?.value?.value ?? 1) * (item.data.data?.quantity?.value ?? 1);
        const coins = toCoins(item.data.data.denomination.value, quantity);
        await actor.deleteEmbeddedEntity('OwnedItem', itemId);
        await addCoinsSimple(actor, {
            coins,
            combineStacks: true,
        });
    }
}