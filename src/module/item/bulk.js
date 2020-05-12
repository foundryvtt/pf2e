export class Bulk {
    constructor(type = 'negligible', value = 0) {
        this.type = type;
        this.value = value;
    }

    toString() {
        if (this.type === 'negligible') {
            return '-';
        } else if (this.type === 'light') {
            return 'L';
        } else {
            return this.value;
        }
    }
}

/**
 * hard coded for now but could be made configurable later on.
 * Describes each stack group by how much items belong in a stack
 * and how much bulk a single stack produces. Bulk type has to be
 * included because coins don't add light bulk below 1000, just 1
 * bulk per 1000 coins
 */
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
    constructor(normal = 0, light = 0) {
        this.normal = normal + Math.floor(light / 10);
        this.light = light % 10;
    }

    toString() {
        if (this.normal === 0 && this.light === 0) {
            return '-';
        } else if (this.normal > 0) {
            return this.normal;
        } else {
            return 'L';
        }
    }
}


export class Item {
    constructor({
        bulk = new Bulk(),
        quantity = 1,
        stackGroup = null,
        isEquipped = false,
        // value to overrides bulk field when unequipped
        unequippedBulk = undefined,
        // value to overrides bulk field when equipped
        equippedBulk = undefined,
        // an item can be a container
        holdsItems = [],
        // some containers like a backpack or back of holding reduce total bulk if 
        // items are put into it
        negateBulk = new CombinedBulk()
    }) {
        this.bulk = bulk;
        this.quantity = quantity;
        this.stackGroup = stackGroup;
        this.holdsItems = holdsItems;
        this.negateBulk = negateBulk;
        this.unequippedBulk = unequippedBulk;
        this.equippedBulk = equippedBulk;
        this.isEquipped = isEquipped;
    }
}

/**
 * Given an array and a key function, create a map where the key is the value that
 * gets returned when each item is pushed into the function. Accumulate
 * items in an array that have the same key
 * @param array
 * @param criterion
 * @return {Map<any, any>}
 */
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

/**
 * Separate function to use in reduce to sum up bulk values
 * @param first
 * @param second
 * @return {CombinedBulk}
 */
function addBulk(first, second) {
    return new CombinedBulk(first.normal + second.normal, first.light + second.light);
}

/**
 * Used for subtracting bulk if items are placed in a container; can never go below 0
 * @param first
 * @param second
 * @return {CombinedBulk}
 */
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

/**
 * Non stackable items multiply their bulk by quantity
 * @param combinedBulk
 * @param factor
 * @return {CombinedBulk}
 */
function multiplyBulk(combinedBulk, factor) {
    return new CombinedBulk(combinedBulk.normal * factor, combinedBulk.light * factor);
}

/**
 * Helper function to be able to easily sum up bulk
 * @param bulk
 * @return {CombinedBulk}
 */
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
 * Various items have different bulk when worn or carried, some don't care at all
 * Depending on if we get data for either state, we override the default bulk
 * @param item
 */
function calculateItemBulk(item) {
    if (item.unequippedBulk !== undefined && !item.isEquipped) {
        return toCombinedBulk(item.unequippedBulk);
    } else if (item.equippedBulk !== undefined && item.isEquipped) {
        return toCombinedBulk(item.equippedBulk);
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

    // sum up quantity
    const quantity = items
        .map((item) => item.quantity)
        .reduce((prev, curr) => prev + curr, 0);

    // always round down for bulk as per RAW
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
 * Calculates the bulk of all items. Note that we don't validate if an item that is a container
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

/**
 * Weight from items includes either an integer or l for light bulk
 * or something that we can't parse and report as no bulk.
 * @param weight
 * @return {Bulk}
 */
function weightToBulk(weight) {
    if (weight === 'l') {
        return new Bulk('light', 1);
    } else {
        const value = parseInt(weight, 10);
        if (isNaN(value)) {
            return new Bulk();
        } else {
            return new Bulk('normal', value);
        }
    }
}

function countCoins(actorData) {
    return Object.values(actorData.data.currency)
        .map(denomination => parseInt(denomination.value, 10))
        .reduce((prev, curr) => prev + curr, 0);
}

const itemTypes = new Set();
itemTypes.add('weapon');
itemTypes.add('armor');
itemTypes.add('equipment');
itemTypes.add('consumable');
itemTypes.add('backpack');

export function toItem(item) {
    const weight = item.data?.weight?.value?.toLowerCase()
        ?.trim() ?? 0; // l or 1..n
    const quantity = item.data?.quantity?.value ?? 0;
    const isEquipped = item.data?.equipped?.value ?? false;

    // TODO: add backpack nesting logic
    // TODO: add stack group logic
    // TODO: find out where to pull equipped bulk or unequipped bulk from
    return new Item({
        bulk: weightToBulk(weight),
        isEquipped,
        quantity
    });
}

/**
 * Takes actor data and returns a list of items to calculate bulk with
 * @param actorData
 */
export function itemsFromActorData(actorData) {
    const items = actorData.items
        .filter(item => itemTypes.has(item.type))
        .map(item => toItem(item));

    items.push(new Item({
        stackGroup: 'coins',
        quantity: countCoins(actorData),
    }));
    return items;
}