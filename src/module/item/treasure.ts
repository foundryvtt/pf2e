import {groupBy, isBlank} from '../utils';
import { TreasureData, ItemData, PhysicalItemData } from './dataDefinitions';
import PF2EActor from '../actor/actor';

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
 * Finds all of the treasure in a list of items, returning a list of the treaure IDs
 * as well as their total net worth.
 */
export function findAllTreasure(items: ItemData[]): SoldItemData {
    const treasureIds = [];
    const coins: Coins = items
        .filter((item): item is TreasureData => item.type === 'treasure'
            && item.data?.denomination?.value !== undefined
            && item.data?.denomination?.value !== null
            && item?.data?.stackGroup?.value !== 'coins')
        .map(item => {
            treasureIds.push(item._id);
            const value = (Number(item.data?.value?.value ?? "1")) * (Number(item.data?.quantity?.value ?? "1"));
            return toCoins(item.data.denomination.value, value);
        })
        .reduce(combineCoins, noCoins());
    return {treasureIds, coins};
}

/**
 * Sums up all treasures in an actor's inventory to obtain total wealth.
 */
export function calculateWealth(items: ItemData[]): Coins {
    return items
        .filter((item): item is TreasureData => item.type === 'treasure'
            && item?.data?.denomination?.value !== undefined
            && item?.data?.denomination?.value !== null)
        .map(item => {
            const value = (Number(item.data?.value?.value ?? "1")) * (Number(item.data?.quantity?.value ?? "1"));
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

function isTopLevelCoin(item: ItemData, currencies: Set<string>): item is TreasureData {
    return item?.type === 'treasure'
        && Number(item?.data?.value?.value) === 1
        && item?.data?.stackGroup?.value === 'coins'
        && isBlank(item?.data?.containerId?.value)
        && currencies.has(item?.data?.denomination?.value);
}

interface AddCoinsParameters {
    items?: ItemData[],
    coins?: Coins,
    combineStacks?: boolean,
    updateItemQuantity?: (item: PhysicalItemData, quantity: number) => Promise<void>,
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
        .filter((item): item is TreasureData => combineStacks && isTopLevelCoin(item, currencies));
    const coinsByDenomination: Map<string, TreasureData[]> = groupBy(topLevelCoins, item => item?.data?.denomination?.value);

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

export function addCoinsSimple(actor: PF2EActor, {
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

export function sellAllTreasureSimple(actor: PF2EActor): Promise<[PF2EActor, void]> {
    const {treasureIds, coins} = findAllTreasure(actor.data.items);
    return Promise.all([
        actor.deleteEmbeddedEntity('OwnedItem', treasureIds),
        addCoinsSimple(actor, {
            coins,
            combineStacks: true,
        }),
    ]);
}

/**
 * Converts a non-coin treasure in an actor's inventory to coinage, removing the item in the process.
 * @return {Promise} Resolves after the treasure is removed and coins updated.
 */
export async function sellTreasure(actor: PF2EActor, itemId: string): Promise<void> {
    const item = actor.getOwnedItem(itemId);
    if (item === null || item === undefined) {
        return Promise.resolve();
    }

    if (item.data.type === 'treasure'
        && item.data.data.denomination?.value !== undefined
        && item.data.data.denomination?.value !== null
        && item.data.data.stackGroup?.value !== 'coins') {
        const quantity = (Number(item.data.data?.value?.value ?? "1")) * (item.data.data?.quantity?.value ?? 1);
        const coins = toCoins(item.data.data.denomination.value, quantity);
        await actor.deleteEmbeddedEntity('OwnedItem', itemId);
        await addCoinsSimple(actor, {
            coins,
            combineStacks: true,
        });
    }

    return Promise.resolve();
}