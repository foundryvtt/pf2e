/**
 * Sums up all treasures in an actor's inventory and fills the
 * @param items
 * @return {*}
 */
import { groupBy, isBlank } from '../utils.js';

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

const coinCompendiumIds = {
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