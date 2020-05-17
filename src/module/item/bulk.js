// eslint-disable-next-line max-classes-per-file
import { add, combineObjects, groupBy, isBlank } from '../utils.js';

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

    plus(bulk) {
        return new Bulk({
            normal: this.normal + bulk.normal,
            light: this.light + bulk.light
        });
    }

    minus(bulk) {
        // 1 bulk is 10 light bulk
        const [thisBulk, otherBulk] = this._toSingleNumber(bulk);
        const result = thisBulk - otherBulk;

        // bulk can't get negative
        if (result < 0) {
            return new Bulk();
        }
        return new Bulk({
            normal: Math.floor(result / 10),
            light: result % 10,
        });
    }

    _toSingleNumber(bulk) {
        return [
            this.normal * 10 + this.light,
            bulk.normal * 10 + bulk.light
        ];
    }

    times(factor) {
        return new Bulk({
            normal: this.normal * factor,
            light: this.light * factor
        });
    }

    isSmallerThan(bulk) {
        const [thisBulk, otherBulk] = this._toSingleNumber(bulk);
        return thisBulk < otherBulk;
    }

    isBiggerThan(bulk) {
        const [thisBulk, otherBulk] = this._toSingleNumber(bulk);
        return thisBulk > otherBulk;
    }

    isEqualTo(bulk) {
        return this.normal === bulk.normal && this.light === bulk.light;
    }

}

/**
 * Produces strings like: "-", "L", "2L", "3", "3; L", "4; 3L" to display bulk in the frontend
 * bulk comlumn
 * @param bulk
 * @return {string}
 */
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

export class BulkItem {
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
 * Various items have different bulk when worn or carried, some don't care at all
 * Depending on if we get data for either state, we override the default bulk
 * @param item
 */
function calculateNonStackBulk(item) {
    if (item.unequippedBulk !== undefined && item.unequippedBulk !== null && !item.isEquipped) {
        return item.unequippedBulk;
    }
    if (item.equippedBulk !== undefined && item.equippedBulk !== null && item.isEquipped) {
        return item.equippedBulk;
    }
    return item.bulk;
}

/**
 * Sum up bulk and stack overflows separately
 * @param first
 * @param second
 * @return {[Bulk, {}]}
 */
function combineBulkAndOverflow(first, second) {
    const [firstBulk, firstOverflow] = first;
    const [secondBulk, secondOverflow] = second;
    return [
        firstBulk.plus(secondBulk),
        combineObjects(firstOverflow, secondOverflow, add)
    ];
}

/**
 * Calculates the bulk for stacks of ammunition, coins and rations;
 * Returns the remainders as overflow for further calculation
 * @param itemStacks and object containing the stack name as key and quantity as value
 * @param stackDefinitions
 * @param bulkConfig
 * @return {[Bulk, {}]}
 */
function calculateStackBulk(itemStacks, stackDefinitions, bulkConfig = {}) {
    return Object.entries(itemStacks)
        .filter(([stackType]) => !(bulkConfig.ignoreCoinBulk && stackType === 'coins'))
        .map(([stackType, quantity]) => {
            if (!(stackType in stackDefinitions)) {
                throw new Error(`No stack definition found for stack ${stackType}`);
            }
            const { size, lightBulk } = stackDefinitions[stackType];
            const bulkRelevantQuantity = Math.floor(quantity / size);
            const itemBulk = new Bulk({ light: bulkRelevantQuantity * lightBulk });
            const overflow = { [stackType]: quantity % size };
            return [itemBulk, overflow];
        })
        .reduce(combineBulkAndOverflow, [new Bulk(), {}]);
}

function calculateItemBulk(item, stackDefinitions, bulkConfig) {
    const stackName = item.stackGroup;
    if (isBlank(stackName)) {
        return [calculateNonStackBulk(item).times(item.quantity), {}];
    }
    return calculateStackBulk({ [stackName]: item.quantity }, stackDefinitions, bulkConfig);
}

/**
 * Extra dimensional containers don't work in extra dimensional containers. Similarly
 * backpacks only reduce weight when worn
 * @param item
 * @param nestedExtraDimensionalContainer
 * @return {boolean|*}
 */
function isExtraDimensionalOrWorn(item, nestedExtraDimensionalContainer) {
    return (item.extraDimensionalContainer && !nestedExtraDimensionalContainer)
        || (item.reducesBulk && item.isEquipped);
}

/**
 * Item bulk can be reduced by backpacks or extra dimensional containers. Backpacks need to be
 * worn and extra dimensional containers must not be inside of another extra dimensional container
 * for this to work though.
 * @param bulk
 * @param item
 * @param nestedExtraDimensionalContainer
 * @return {Bulk|Bulk|*}
 */
function reduceNestedItemBulk(bulk, item, nestedExtraDimensionalContainer) {
    if (isExtraDimensionalOrWorn(item, nestedExtraDimensionalContainer)) {
        return bulk.minus(item.negateBulk);
    }
    return bulk;
}

/**
 * Stacks don't overflow if inside extra dimensional containers or overflowing bulk is turned off
 * @param overflow
 * @param item
 * @param ignoreContainerOverflow
 * @return {{}|*}
 */
function calculateChildOverflow(overflow, item, ignoreContainerOverflow) {
    if (item.extraDimensionalContainer || ignoreContainerOverflow) {
        return {}
    }
    return overflow;
}

/**
 * Calculate the bulk for an item and it's held items.
 * @param item
 * @param stackDefinitions
 * @param nestedExtraDimensionalContainer true if the item is inside an extra dimensional container
 * @param bulkConfig
 * @return {(Bulk|Bulk|{})[]}
 */
function calculateCombinedBulk(item, stackDefinitions, nestedExtraDimensionalContainer = false, bulkConfig = {}) {
    const [mainBulk, mainOverflow] = calculateItemBulk(item, stackDefinitions, bulkConfig);

    const [childBulk, childOverflow] = item.holdsItems
        .map(child => calculateCombinedBulk(child, stackDefinitions, item.extraDimensionalContainer, bulkConfig))
        .reduce(combineBulkAndOverflow, [new Bulk(), {}]);

    // combine item overflow and child overflow
    const combinedOverflow = combineObjects(
        mainOverflow, 
        calculateChildOverflow(childOverflow, item, bulkConfig.ignoreContainerOverflow), 
        add
    );
    const [overflowBulk, remainingOverflow] = calculateStackBulk(combinedOverflow, stackDefinitions, bulkConfig);
    return [
        mainBulk
            .plus(reduceNestedItemBulk(childBulk, item, nestedExtraDimensionalContainer))
            .plus(overflowBulk),
        remainingOverflow
    ];
}

/**
 * Calculates the bulk of all items. Note that we don't validate if an item that is a container
 * contains only the allowed amount.
 * @param items a list of items; items can also be containers and contain items themselves
 * armor or weapons that are placed in a sheathe should be combined in a single container as well
 * @param stackDefinitions a list of stack groups and bulk values per group
 * @param nestedExtraDimensionalContainer true if you have a bag of holding inside a bag of holding
 * only the first bag of holding reduces bulk, the nested one stops working as per RAW
 * @param bulkConfig
 * @return {*}
 */
export function calculateBulk(items, stackDefinitions, nestedExtraDimensionalContainer = false, bulkConfig = {}) {
    const inventory = new BulkItem({
        holdsItems: items
    });
    return calculateCombinedBulk(inventory, stackDefinitions, nestedExtraDimensionalContainer, bulkConfig);
}


const lightBulkRegex = /^(\d*)l$/i;
const complexBulkRegex = /^(\d+);\s*(\d*)l$/i;

/**
 * Accepted formats:
 * "l", "1", "L", "1; L", "2; 3L", "2;3L"
 * @param weight if not parseable will return null or undefined
 * @return {Bulk}
 */
export function weightToBulk(weight) {
    if (weight === undefined || weight === null) {
        return undefined;
    }
    const trimmed = weight.trim();
    if (/^\d+$/.test(trimmed)) {
        return new Bulk({ normal: parseInt(trimmed, 10) });
    }
    const lightMatch = trimmed.match(lightBulkRegex);
    if (lightMatch) {
        return new Bulk({ light: parseInt(lightMatch[1] || '1', 10) });
    }
    const complexMatch = trimmed.match(complexBulkRegex);
    if (complexMatch) {
        const [, normal, light] = complexMatch;
        return new Bulk({
            normal: parseInt(normal, 10),
            light: parseInt(light || '1', 10),
        });
    }
    return undefined;
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
 * @return {BulkItem}
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

    return new BulkItem({
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
function toBulkItems(items) {
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

    const items = toBulkItems(itemsHavingBulk);
    items.push(new BulkItem({
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
 * @param brokenWeight
 * @return {null|string}
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