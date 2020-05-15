/**
 * hard coded for now but could be made configurable later on.
 * Describes each stack group by how much items belong in a stack
 * and how much bulk a single stack produces. Bulk type has to be
 * included because coins don't add light bulk below 1000, just 1
 * bulk per 1000 coins
 */
// eslint-disable-next-line max-classes-per-file
export const stacks = {
    bolts: {
        size: 10,
        lightBulk: 1,
    },
    arrows: {
        size: 10,
        lightBulk: 1,
    },
    slingBullets: {
        size: 10,
        lightBulk: 1,
    },
    blowgunDarts: {
        size: 10,
        lightBulk: 1,
    },
    rations: {
        size: 7,
        lightBulk: 1,
    },
    coins: {
        size: 1000,
        lightBulk: 10,
    }
};

export class Bulk {
    constructor({ normal = 0, light = 0 } = {}) {
        this.normal = normal + Math.floor(light / 10);
        this.light = light % 10;
    }

    get isNegligible() {
        return this.normal === 0 && this.light === 0;
    }
}

export function formatBulk(bulk) {
    if (bulk.normal === 0 && bulk.light === 0) {
        return '-';
    }
    if (bulk.normal > 0 && bulk.light === 0) {
        return `${bulk.normal}`;
    }
    if (bulk.light === 1 && bulk.normal === 0) {
        return `L`;
    }
    if (bulk.light > 0 && bulk.normal === 0) {
        return `${bulk.light}L`;
    }
    return `${bulk.normal}; ${bulk.light}L`;
}

export class ContainerOrItem {
    constructor({
        bulk = new Bulk(),
        quantity = 1,
        stackGroup = undefined,
        isEquipped = false,
        // value to overrides bulk field when unequipped
        unequippedBulk = undefined,
        // value to overrides bulk field when equipped
        equippedBulk = undefined,
        holdsItems = [],
        // some containers like a backpack or back of holding reduce total bulk if 
        // items are put into it
        negateBulk = new Bulk(),
        // extra dimensional containers cease to work when nested inside each other
        extraDimensionalContainer = false,
    } = {}) {
        this.bulk = bulk;
        this.quantity = quantity;
        this.stackGroup = stackGroup;
        this.holdsItems = holdsItems;
        this.negateBulk = negateBulk;
        this.unequippedBulk = unequippedBulk;
        this.equippedBulk = equippedBulk;
        this.isEquipped = isEquipped;
        this.extraDimensionalContainer = extraDimensionalContainer;
    }

    get reducesBulk() {
        return !this.negateBulk.isNegligible;
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
 * @return {Bulk}
 */
function addBulk(first, second) {
    return new Bulk({
        normal: first.normal + second.normal,
        light: first.light + second.light
    });
}

/**
 * Used for subtracting bulk if items are placed in a container; can never go below 0
 * @param first
 * @param second
 * @return {Bulk}
 */
function subtractBulk(first, second) {
    // 1 bulk is 10 light bulk
    const firstNumberedBulk = first.normal * 10 + first.light;
    const secondNumberedBulk = second.normal * 10 + second.light;
    const result = firstNumberedBulk - secondNumberedBulk;

    // bulk can't get negative
    if (result < 0) {
        return new Bulk();
    }
    return new Bulk({
        normal: Math.floor(result / 10),
        light: result % 10,
    });

}

/**
 * Non stackable items multiply their bulk by quantity
 * @param bulk
 * @param factor
 * @return {Bulk}
 */
function multiplyBulk(bulk, factor) {
    return new Bulk({
        normal: bulk.normal * factor,
        light: bulk.light * factor,
    });
}

/**
 * Various items have different bulk when worn or carried, some don't care at all
 * Depending on if we get data for either state, we override the default bulk
 * @param item
 */
function calculateItemBulk(item) {
    if (item.unequippedBulk !== undefined && item.unequippedBulk !== null && !item.isEquipped) {
        return item.unequippedBulk;
    }
    if (item.equippedBulk !== undefined && item.equippedBulk !== null && item.isEquipped) {
        return item.equippedBulk;
    }
    return item.bulk;

}

/**
 * Single items just add up normally
 * @param items
 * @return {*}
 */
function calculateNonStackBulk(items) {
    return items
        .map((item) => multiplyBulk(calculateItemBulk(item), item.quantity))
        .reduce(addBulk, new Bulk());
}

/**
 * All items in this stack are from the same group so they add up by the stack size
 * @param items
 * @param stackDefinition
 */
function calculateStackBulk(items, stackDefinition) {
    const { size, lightBulk } = stackDefinition;

    // sum up quantity
    const quantity = items
        .map((item) => item.quantity)
        .reduce((prev, curr) => prev + curr, 0);

    // always round down for bulk as per RAW
    const bulkRelevantQuantity = Math.floor(quantity / size);

    return new Bulk({ light: lightBulk * bulkRelevantQuantity });
}

/**
 * Calculates the bulk of a list of items in the same stack group
 * @param key null means that the item is in no stack group
 * @param values
 * @param stackDefinitions
 * @return {Bulk|*}
 */
function calculateGroupedItemsBulk(key, values, stackDefinitions, bulkConfig) {
    if (bulkConfig.ignoreCoinBulk && key === "coins") return new Bulk();
    if (key === null || key === undefined) {
        return calculateNonStackBulk(values);
    }
    return calculateStackBulk(values, stackDefinitions[key]);

}

/**
 * Calculates the bulk of all items. Note that we don't validate if an item that is a container
 * contains only the allowed amount.
 * @param items a list of items; items can also be containers and contain items themselves
 * armor or weapons that are placed in a sheathe should be combined in a single container as well
 * @param stackDefinitions a list of stack groups and bulk values per group
 * @param nestedExtraDimensionalContainer true if you have a bag of holding inside a bag of holding
 * only the first bag of holding reduces bulk, the nested one stops working as per RAW
 * @return {*}
 */
export function calculateBulk(items, stackDefinitions, nestedExtraDimensionalContainer = false, bulkConfig = {}) {
    const stackGroups = groupBy(items, (e) => {
        // can be empty string as well
        const group = e.stackGroup;
        if (group === null || group === undefined || group.trim() === '') {
            return null;
        }
        return group;
    });
    return Array.from(stackGroups.entries())
        .map(([stackName, stackGroup]) => {
            if (stackName !== null && stackName !== undefined && !(stackName in stackDefinitions)) {
                throw new Error(`No stack definition found for stack ${stackName}`);
            }

            // containers don't reduce their own bulk, so they need to be 
            // calculated separately
            const itemBulk = calculateGroupedItemsBulk(stackName, stackGroup, stackDefinitions, bulkConfig);
            const containsBulk = stackGroup
                .map(item => {
                    // first calculate bulk of items in a container
                    const itemsBulk = calculateBulk(
                        item.holdsItems,
                        stackDefinitions,
                        item.extraDimensionalContainer,
                        bulkConfig
                    );

                    // then check if bulk can be reduced
                    // bulk can only be reduced for worn containers and only once for extra
                    // dimensional containers
                    if ((item.extraDimensionalContainer && !nestedExtraDimensionalContainer)
                        || (item.reducesBulk && item.isEquipped)) {
                        return subtractBulk(itemsBulk, item.negateBulk);
                    }
                    return itemsBulk;

                })
                .reduce(addBulk, new Bulk());

            return addBulk(itemBulk, containsBulk);
        })
        .reduce(addBulk, new Bulk());
}

/**
 * Weight from items includes either an integer or l for light bulk
 * or something that we can't parse and report as no bulk.
 * @param weight must be string containing a number or "l"; undefined, null or non
 * parseable strings return undefined
 * null
 * @return {Bulk}
 */
export function weightToBulk(weight) {
    if (weight === undefined || weight === null) {
        return undefined;
    }
    if (weight === 'l') {
        return new Bulk({ light: 1 });
    }
    const value = parseInt(weight, 10);
    if (Number.isNaN(value)) {
        return undefined;
    }
    return new Bulk({ normal: value });
}

/**
 * Needed because some weight is either null, undefined, a number or a string :(
 * @param weight
 */
export function normalizeWeight(weight) {
    if (weight === null || weight === undefined) {
        return undefined;
    }
    // turn numbers into strings
    const stringWeight = `${weight}`;
    return stringWeight.toLowerCase()
        .trim();

}

function countCoins(actorData) {
    return Object.values(actorData?.data?.currency ?? {})
        .map(denomination => parseInt(denomination.value, 10))
        .reduce((prev, curr) => prev + curr, 0);
}

/**
 *
 * @param item
 * @param nestedItems
 * @return {ContainerOrItem}
 */
export function toItemOrContainer(item, nestedItems = []) {
    const weight = item.data?.weight?.value;
    const quantity = item.data?.quantity?.value ?? 0;
    const isEquipped = item.data?.equipped?.value ?? false;
    const equippedBulk = item.data?.equippedBulk?.value;
    const unequippedBulk = item.data?.unequippedBulk?.value;
    const stackGroup = item.data?.stackGroup?.value;
    const negateBulk = item.data?.negateBulk?.value;
    const extraDimensionalContainer = item.data?.traits?.value?.includes('extradimensional') ?? false;

    return new ContainerOrItem({
        bulk: weightToBulk(normalizeWeight(weight)) ?? new Bulk(),
        negateBulk: weightToBulk(normalizeWeight(negateBulk)) ?? new Bulk(),
        // this stuff overrides bulk so we don't want to default to 0 bulk if undefined
        unequippedBulk: weightToBulk(normalizeWeight(unequippedBulk)),
        equippedBulk: weightToBulk(normalizeWeight(equippedBulk)),
        holdsItems: nestedItems,
        stackGroup,
        isEquipped,
        quantity,
        extraDimensionalContainer
    });
}

/**
 * Recursively build items by checking if groupedItems contains a list
 * under their data._id
 * @param items
 * @param groupedItems items grouped by data.containerId.value
 * @return {*}
 */
function buildContainerTree(items, groupedItems) {
    return items
        .map((item) => {
            const itemId = item._id;
            if (itemId !== null && itemId !== undefined && groupedItems.has(itemId)) {
                const itemsInContainer = buildContainerTree(groupedItems.get(itemId), groupedItems);
                return toItemOrContainer(item, itemsInContainer);
            }
            return toItemOrContainer(item);

        });
}

/**
 * Items that reference other others need to be nested into them. If an item has a reference
 * to an id, it should be nested into that container unless the container with that id does
 * not exist.
 *
 * All other items are top level items.
 * @param items
 * @return {*[]|*}
 */
function toContainerOrItems(items) {
    const allIds = new Set(items.map(item => item._id));
    const itemsInContainers = groupBy(items, (item) => {
        // we want all items in the top level group that are in no container
        // or are never referenced because we don't want the items to
        // disappear if the container is being deleted or doesn't have a reference
        const ref = item.data?.containerId?.value ?? null;
        if (ref === null || !allIds.has(ref)) {
            return null;
        }
        return item._id;
    });

    if (itemsInContainers.has(null)) {
        const topLevelItems = itemsInContainers.get(null);
        return buildContainerTree(topLevelItems, itemsInContainers);
    }
    return [];

}

const itemTypesWithBulk = new Set();
itemTypesWithBulk.add('weapon');
itemTypesWithBulk.add('armor');
itemTypesWithBulk.add('equipment');
itemTypesWithBulk.add('consumable');
itemTypesWithBulk.add('backpack');

/**
 * Takes actor data and returns a list of items to calculate bulk with
 * @param actorData
 */
export function itemsFromActorData(actorData) {
    const itemsHavingBulk = actorData.items
        .filter(item => itemTypesWithBulk.has(item.type));

    const items = toContainerOrItems(itemsHavingBulk);
    items.push(new ContainerOrItem({
        stackGroup: 'coins',
        quantity: countCoins(actorData),
    }));
    return items;
}

/**
 * Carried armor usually has one more bulk when not worn, or 1 bulk if L
 * @param wornBulk
 * @return {string}
 */
export function calculateCarriedArmorBulk(wornBulk) {
    const bulk = weightToBulk(normalizeWeight(wornBulk)) ?? new Bulk();
    if (bulk.light === 1) {
        return '1';
    }
    if (bulk.normal > 0) {
        return `${bulk.normal + 1}`;
    }
    return '-';
}

/**
 * Fix previous borked weight
 * @param wornBulk
 * @return {string}
 */
export function fixWeight(brokenWeight) {
    const bulk = weightToBulk(normalizeWeight(brokenWeight)) ?? new Bulk();
    if (bulk.light === 1) {
        return 'l';
    }
    if (bulk.normal > 0) {
        return `${bulk.normal}`;
    }
    return null;
}