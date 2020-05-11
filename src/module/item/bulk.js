export class Bulk {
    type = 'negligible';
    value = 0;

    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

export const stacks = {
    bolts: {
        size: 10,
        bulk: new Bulk('light', 1)
    },
    arrows: {
        size: 10,
        bulk: new Bulk('light', 1)
    },
    slingBullets: {
        size: 10,
        bulk: new Bulk('light', 1)
    },
    blowgunDarts: {
        size: 10,
        bulk: new Bulk('light', 1)
    },
    rations: {
        size: 7,
        bulk: new Bulk('light', 1)
    },
    coins: {
        size: 1000,
        bulk: new Bulk('normal', 1)
    }
};

export class CombinedBulk {
    normal = 0;
    light = 0;

    constructor(normal = 0, light = 0) {
        this.normal = normal + Math.floor(light / 10);
        this.light = light % 10;
    }
}


export class Item {
    bulk = new Bulk();
    quantity = 1;
    stackGroup = null;
    // worn armor is lighter
    isArmorButNotWorn = false;
    // an item can be a container
    holdsItems = [];
    // some containers like a backpack or back of holding reduce total bulk if 
    // items are put into it
    negateBulk = new CombinedBulk();

    constructor({
        bulk = new Bulk(),
        quantity = 1,
        stackGroup = null,
        isArmorButNotWorn = false,
        holdsItems = [],
        negateBulk = new CombinedBulk()
    }) {
        this.bulk = bulk;
        this.quantity = quantity;
        this.stackGroup = stackGroup;
        this.isArmorButNotWorn = isArmorButNotWorn;
        this.holdsItems = holdsItems;
        this.negateBulk = negateBulk;
    }
}

function groupBy(array, criterion) {
    const result = new Map();
    for (const elem of array) {
        const key = criterion(elem);
        if (result.get(key) === undefined) {
            result.set(key, [elem]);
        } else {
            result.get(key)
                .push(elem);
        }
    }
    return result;
}

function addBulk(first, second) {
    return new CombinedBulk(first.normal + second.normal, first.light + second.light);
}

function subtractBulk(first, second) {
    // 1 bulk is 10 light bulk
    const firstNumberedBulk = first.normal * 10 + first.light;
    const secondNumberedBulk = second.normal * 10 + second.light;
    const result = firstNumberedBulk - secondNumberedBulk;

    // bulk can't get negative
    if (result < 0) {
        return new CombinedBulk(0, 0);
    } else {
        return new CombinedBulk(Math.floor(result / 10), result % 10);
    }
}

function multiplyBulk(combinedBulk, factor) {
    return new CombinedBulk(combinedBulk.normal * factor, combinedBulk.light * factor);
}

function toCombinedBulk(bulk) {
    if (bulk.type === 'light') {
        return new CombinedBulk(0, bulk.value);
    } else if (bulk.type === 'normal') {
        return new CombinedBulk(bulk.value);
    } else {
        return new CombinedBulk();
    }
}

/**
 * This entry gives the armor’s Bulk, assuming you’re wearing the armor and distributing its
 * weight across your body. A suit of armor that’s carried or worn usually has 1 more Bulk than
 * what’s listed here (or 1 Bulk total for armor of light Bulk)
 * @param item
 */
function calculateItemBulk(item) {
    if (item.isArmorButNotWorn) {
        if (item.bulk.type === 'light') {
            return toCombinedBulk(new Bulk('normal', item.bulk.value));
        } else if (item.bulk.type === 'normal') {
            return toCombinedBulk(new Bulk('normal', item.bulk.value + 1));
        } else {
            // negligible armor is still negligible
            return new CombinedBulk();
        }
    } else {
        return toCombinedBulk(item.bulk);
    }
}

/**
 * Single items just add up normally
 * @param items
 * @return {*}
 */
function calculateNonStackBulk(items) {
    return items
        .map((item) => multiplyBulk(calculateItemBulk(item), item.quantity))
        .reduce(addBulk, new CombinedBulk());
}

/**
 * All items in this stack are from the same group so they add up by the stack size
 * @param items
 * @param stackDefinition
 */
function calculateStackBulk(items, stackDefinition) {
    const size = stackDefinition.size;
    const bulk = stackDefinition.bulk;

    const quantity = items
        .map((item) => item.quantity)
        .reduce((prev, curr) => prev + curr, 0);

    // always round down for bulk
    const bulkRelevantQuantity = Math.floor(quantity / size);

    return toCombinedBulk(new Bulk(bulk.type, bulk.value * bulkRelevantQuantity));
}

/**
 * Calculates the bulk of a list of items in the same stack group
 * @param key null means that the item is in no stack group
 * @param values
 * @param stackDefinitions
 * @return {CombinedBulk|*}
 */
function calculateGroupedItemsBulk(key, values, stackDefinitions) {
    if (key === null) {
        return calculateNonStackBulk(values);
    } else {
        return calculateStackBulk(values, stackDefinitions[key]);
    }
}

/**
 * Calculates the bulk of all containers. Note that we don't validate if a container
 * contains only the allowed amount.
 * @param items a list of items; items can also be containers and contain items themselves
 * armor or weapons that are placed in a sheathe should be combined in a single container as well
 * @param stackDefinitions a list of stack groups and bulk values per group
 * @return {*}
 */
export function calculateBulk(items, stackDefinitions) {
    const itemGroups = groupBy(items, (e) => e.stackGroup);
    return Array.from(itemGroups.entries())
        .map(([key, items]) => {
            if (key !== null && !(key in stackDefinitions)) {
                throw new Error('No stack definition found for stack ' + key);
            }

            const itemBulk = calculateGroupedItemsBulk(key, items, stackDefinitions);

            // a container also has bulk and can be stacked (e.g. sacks)
            const containsBulk = items
                .map(item => {
                    const containerBulk = calculateBulk(item.holdsItems, stackDefinitions);
                    return subtractBulk(containerBulk, item.negateBulk);
                })
                .reduce(addBulk, new CombinedBulk());

            return addBulk(itemBulk, containsBulk);
        })
        .reduce(addBulk, new CombinedBulk());
}
