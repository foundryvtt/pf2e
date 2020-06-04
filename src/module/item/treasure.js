import { groupBy, isBlank } from '../utils.js';

/**
 * Finds all non-coin treasures in a list of items
 * @return {{treasureIds: Array, coins: Object}} List of treasures to remove and coins to add
 */
export function sellAllTreasure(items) {
    const treasureIds = [];
    const coins = items
        .filter(item => item.type === 'treasure'
            && item.data?.denomination?.value !== undefined
            && item.data?.denomination?.value !== null
            && item?.data?.stackGroup?.value !== 'coins')
        .map(item => {
            treasureIds.push(item._id);
            return {
                [item.data.denomination.value]: (item.data?.value?.value ?? 1) * (item.data?.quantity?.value ?? 1),
            };
        })
        .reduce((prev, curr) => {
            return {
                pp: prev.pp + (curr.pp || 0),
                gp: prev.gp + (curr.gp || 0),
                sp: prev.sp + (curr.sp || 0),
                cp: prev.cp + (curr.cp || 0),
            };
        }, {
            pp: 0,
            gp: 0,
            sp: 0,
            cp: 0
        });
    return {treasureIds, coins};
}

export function sellAllTreasureSimple(actor) {
    const {treasureIds, coins} = sellAllTreasure(actor.data.items);
    return Promise.all([
        actor.deleteEmbeddedEntity("OwnedItem", treasureIds),
        addCoinsSimple(actor, {
            coins,
            combineStacks: true,
        })
    ]);
}

/**
 * Converts a non-coin treasure in an actor's inventory to coinage
 * @param actor
 * @param itemId
 * @return {Promise} Resolves after the treasure is removed and coins updated
 */
export async function sellTreasure(actor, itemId) {
    const item = actor.getOwnedItem(itemId);
    if (item?.type === 'treasure'
        && item.data.data?.denomination?.value !== undefined
        && item.data.data?.denomination?.value !== null
        && item.data.data?.stackGroup?.value !== 'coins') {
        let coins = {
            [item.data.data.denomination.value]:
                (item.data.data?.value?.value ?? 1) * (item.data.data?.quantity?.value ?? 1),
        };
        await actor.deleteEmbeddedEntity("OwnedItem", itemId);
        await addCoinsSimple(actor, {
            coins,
            combineStacks: true,
        });
    }
}

/**
 * Sums up all treasures in an actor's inventory and fills the
 * @param items
 * @return {*}
 */
export function calculateWealth(items) {
    return items
        .filter(item => item.type === 'treasure'
            && item?.data?.denomination?.value !== undefined
            && item?.data?.denomination?.value !== null)
        .map(item => {
            return {
                [item.data.denomination.value]: (item.data?.value?.value ?? 1) * (item.data?.quantity?.value ?? 1),
            };
        })
        .reduce((prev, curr) => {
            return {
                pp: (prev.pp || 0) + (curr.pp || 0),
                gp: (prev.gp || 0) + (curr.gp || 0),
                sp: (prev.sp || 0) + (curr.sp || 0),
                cp: (prev.cp || 0) + (curr.cp || 0),
            };
        }, {
            pp: 0,
            gp: 0,
            sp: 0,
            cp: 0
        });
}

export const coinCompendiumIds = {
    pp: 'JuNPeK5Qm1w6wpb4',
    gp: 'B6B7tBWJSqOBz5zz',
    sp: '5Ew82vBF9YfaiY9f',
    cp: 'lzJ8AVhRcbFul5fh',
};

function isTopLevelCoin(item, currencies) {
    return item?.type === 'treasure'
        && item?.data?.value?.value === 1
        && item?.data?.stackGroup?.value === 'coins'
        && isBlank(item?.data?.containerId?.value)
        && currencies.has(item?.data?.denomination?.value);
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
    updateItemQuantity = async () => undefined,
    addFromCompendium = async () => undefined
} = {}) {
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

export function addCoinsSimple(actor, {
    coins = {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    },
    combineStacks = false,
} = {}) {
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
