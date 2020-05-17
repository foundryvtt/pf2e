const currencyIdentity = {
    pp: 0,
    gp: 0,
    sp: 0,
    cp: 0
};

/**
 * Sums up all currencies in an actor's inventory and fills the
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
        }, currencyIdentity);
}
