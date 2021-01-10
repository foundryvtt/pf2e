import { add, combineObjects, groupBy, isBlank, Optional } from '../utils';
import { ItemData, isPhysicalItem, PhysicalItemData } from './dataDefinitions';

interface StackDefinition {
    size: number;
    lightBulk: number;
}
export type StackDefinitions = Record<string, StackDefinition>;

/**
 * hard coded for now but could be made configurable later on.
 * Describes each stack group by how much items belong in a stack
 * and how much bulk a single stack produces. Bulk type has to be
 * included because coins don't add light bulk below 1000, just 1
 * bulk per 1000 coins
 */
export const stacks: StackDefinitions = {
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
    },
    gems: {
        size: 2000,
        lightBulk: 10,
    },
};

/**
 * @category Other
 */
export class Bulk {
    normal: number;

    light: number;

    constructor({ normal = 0, light = 0 }: { normal?: number; light?: number } = {}) {
        this.normal = normal + Math.floor(light / 10);
        this.light = light % 10;
    }

    get isNegligible(): boolean {
        return this.normal === 0 && this.light === 0;
    }

    get isLight(): boolean {
        return this.toLightBulk() < 10 && !this.isNegligible;
    }

    toLightBulk(): number {
        return this.normal * 10 + this.light;
    }

    plus(bulk: Bulk): Bulk {
        return new Bulk({
            normal: this.normal + bulk.normal,
            light: this.light + bulk.light,
        });
    }

    minus(bulk: Bulk): Bulk {
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

    _toSingleNumber(bulk: Bulk): [number, number] {
        return [this.normal * 10 + this.light, bulk.normal * 10 + bulk.light];
    }

    times(factor: number): Bulk {
        return new Bulk({
            normal: this.normal * factor,
            light: this.light * factor,
        });
    }

    isSmallerThan(bulk: Bulk): boolean {
        const [thisBulk, otherBulk] = this._toSingleNumber(bulk);
        return thisBulk < otherBulk;
    }

    isBiggerThan(bulk: Bulk): boolean {
        const [thisBulk, otherBulk] = this._toSingleNumber(bulk);
        return thisBulk > otherBulk;
    }

    isEqualTo(bulk: Bulk): boolean {
        return this.normal === bulk.normal && this.light === bulk.light;
    }

    isPositive(): boolean {
        return this.normal > 0 || this.light > 0;
    }

    toString(): string {
        return `normal: ${this.normal}; light: ${this.light}`;
    }
}

// see https://2e.aonprd.com/Rules.aspx?ID=257
export type Sizes = 'tiny' | 'sm' | 'med' | 'lg' | 'huge' | 'grg';

export interface BulkConversion {
    bulkLimitFactor: number;
    treatsAsLight: string | null;
    treatsAsNegligible: string | null;
}

export type BulkConversions = Record<Sizes, BulkConversion>;
export const bulkConversions: BulkConversions = {
    tiny: {
        bulkLimitFactor: 0.5,
        treatsAsLight: '-',
        treatsAsNegligible: null,
    },
    sm: {
        bulkLimitFactor: 1,
        treatsAsLight: 'L',
        treatsAsNegligible: '-',
    },
    med: {
        bulkLimitFactor: 1,
        treatsAsLight: 'L',
        treatsAsNegligible: '-',
    },
    lg: {
        bulkLimitFactor: 2,
        treatsAsLight: '1',
        treatsAsNegligible: 'L',
    },
    huge: {
        bulkLimitFactor: 4,
        treatsAsLight: '2',
        treatsAsNegligible: '1',
    },
    grg: {
        bulkLimitFactor: 8,
        treatsAsLight: '4',
        treatsAsNegligible: '2',
    },
};

/**
 * Whether a given bulk should considered to be downgraded.
 * @param normalItemBulk
 * @param treatsAsDowngrade if given, a string that ranges from '-', 'L', '1', '2', ...
 * and is equal to the selected cell at https://2e.aonprd.com/Rules.aspx?ID=257
 * For instance treatAsDowngrade with regards to negligible items for large creates would be '1'
 * All bulk sizes lower than or equal to this value are considered to be downgraded.
 */
function bulkDowngradeApplies(normalItemBulk: Bulk, treatsAsDowngrade: string | null): boolean {
    return (
        (treatsAsDowngrade === '-' && normalItemBulk.isNegligible) ||
        (treatsAsDowngrade === 'L' && normalItemBulk.isLight) ||
        (treatsAsDowngrade !== null && normalItemBulk.normal <= parseInt(treatsAsDowngrade, 10))
    );
}

export function convertBulkToSize(normalItemBulk: Bulk, targetSize: Sizes): Bulk {
    const { treatsAsNegligible, treatsAsLight } = bulkConversions[targetSize];
    if (bulkDowngradeApplies(normalItemBulk, treatsAsNegligible)) {
        return new Bulk();
    }
    if (bulkDowngradeApplies(normalItemBulk, treatsAsLight)) {
        return new Bulk({ light: 1 });
    }
    return normalItemBulk;
}

/**
 * Produces strings like: "-", "L", "2L", "3", "3; L", "4; 3L" to display bulk in the frontend
 * bulk comlumn
 * @param bulk
 * @return
 */
export function formatBulk(bulk: Bulk): string {
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

/**
 * @category Other
 */
export class BulkItem {
    id: string;

    bulk: Bulk;

    quantity: number;

    stackGroup: string;

    isEquipped: boolean;

    unequippedBulk: Bulk;

    equippedBulk: Bulk;

    holdsItems: BulkItem[];

    negateBulk: Bulk;

    extraDimensionalContainer: boolean;

    constructor({
        id = '',
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
    }: {
        id?: string;
        bulk?: Bulk;
        quantity?: number;
        stackGroup?: string;
        isEquipped?: boolean;
        unequippedBulk?: Bulk;
        equippedBulk?: Bulk;
        holdsItems?: BulkItem[];
        negateBulk?: Bulk;
        extraDimensionalContainer?: boolean;
    } = {}) {
        this.id = id;
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

    get reducesBulk(): boolean {
        return !this.negateBulk.isNegligible;
    }
}

/**
 * Various items have different bulk when worn or carried, some don't care at all
 * Depending on if we get data for either state, we override the default bulk
 * @param item
 */
function calculateNonStackBulk(item: BulkItem): Bulk {
    if (item.unequippedBulk !== undefined && item.unequippedBulk !== null && !item.isEquipped) {
        return item.unequippedBulk;
    }
    if (item.equippedBulk !== undefined && item.equippedBulk !== null && item.isEquipped) {
        return item.equippedBulk;
    }
    return item.bulk;
}

type StackGroupOverflow = Record<string, number>;
type BulkAndOverflow = [Bulk, StackGroupOverflow];

/**
 * Sum up bulk and stack overflows separately
 * @param first
 * @param second
 * @return
 */
function combineBulkAndOverflow(first: BulkAndOverflow, second: BulkAndOverflow): BulkAndOverflow {
    const [firstBulk, firstOverflow] = first;
    const [secondBulk, secondOverflow] = second;
    return [firstBulk.plus(secondBulk), combineObjects(firstOverflow, secondOverflow, add)];
}

export interface BulkConfig {
    ignoreCoinBulk: boolean;
    ignoreContainerOverflow: boolean;
}

export const defaultBulkConfig: BulkConfig = {
    ignoreCoinBulk: false,
    ignoreContainerOverflow: false,
};

/**
 * Calculates the bulk for stacks of ammunition, coins and rations;
 * Returns the remainders as overflow for further calculation
 * @param itemStacks and object containing the stack name as key and quantity as value
 * @param stackDefinitions
 * @param bulkConfig
 * @return
 */
function calculateStackBulk(
    itemStacks: Record<string, number>,
    stackDefinitions: StackDefinitions,
    bulkConfig: BulkConfig = defaultBulkConfig,
): BulkAndOverflow {
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
            const result: BulkAndOverflow = [itemBulk, overflow];
            return result;
        })
        .reduce(combineBulkAndOverflow, [new Bulk(), {}]);
}

function calculateItemBulk(
    item: BulkItem,
    stackDefinitions: StackDefinitions,
    bulkConfig: BulkConfig,
): BulkAndOverflow {
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
 * @return
 */
function isExtraDimensionalOrWorn(item: BulkItem, nestedExtraDimensionalContainer: boolean): boolean {
    return (
        (item.extraDimensionalContainer && !nestedExtraDimensionalContainer) || (item.reducesBulk && item.isEquipped)
    );
}

/**
 * Item bulk can be reduced by backpacks or extra dimensional containers. Backpacks need to be
 * worn and extra dimensional containers must not be inside of another extra dimensional container
 * for this to work though.
 * @param bulk
 * @param item
 * @param nestedExtraDimensionalContainer
 * @return
 */
function reduceNestedItemBulk(bulk: Bulk, item: BulkItem, nestedExtraDimensionalContainer: boolean): Bulk {
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
function calculateChildOverflow(
    overflow: StackGroupOverflow,
    item: BulkItem,
    ignoreContainerOverflow: boolean,
): StackGroupOverflow {
    if (item.extraDimensionalContainer || ignoreContainerOverflow) {
        return {};
    }
    return overflow;
}

/**
 * Calculate the bulk for an item and it's held items.
 * @param item
 * @param stackDefinitions
 * @param nestedExtraDimensionalContainer true if the item is inside an extra dimensional container
 * @param bulkConfig
 * @return
 */
function calculateCombinedBulk(
    item: BulkItem,
    stackDefinitions: StackDefinitions,
    nestedExtraDimensionalContainer: boolean = false,
    bulkConfig: BulkConfig = defaultBulkConfig,
): BulkAndOverflow {
    const [mainBulk, mainOverflow] = calculateItemBulk(item, stackDefinitions, bulkConfig);
    const [childBulk, childOverflow] = item.holdsItems
        .map((child) => calculateCombinedBulk(child, stackDefinitions, item.extraDimensionalContainer, bulkConfig))
        .reduce(combineBulkAndOverflow, [new Bulk(), {}]);

    // combine item overflow and child overflow
    const combinedOverflow = combineObjects(
        mainOverflow,
        calculateChildOverflow(childOverflow, item, bulkConfig.ignoreContainerOverflow),
        add,
    );
    const [overflowBulk, remainingOverflow] = calculateStackBulk(combinedOverflow, stackDefinitions, bulkConfig);
    return [
        mainBulk.plus(reduceNestedItemBulk(childBulk, item, nestedExtraDimensionalContainer)).plus(overflowBulk),
        remainingOverflow,
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
 * @return
 */
export function calculateBulk(
    items: BulkItem[],
    stackDefinitions: StackDefinitions,
    nestedExtraDimensionalContainer: boolean = false,
    bulkConfig: BulkConfig = defaultBulkConfig,
): BulkAndOverflow {
    const inventory = new BulkItem({
        holdsItems: items,
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
export function weightToBulk(weight: Optional<string>): Bulk | undefined {
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

type BrokenBulk = Optional<string> | Optional<number>;

/**
 * Needed because some weight is either null, undefined, a number or a string :(
 * @param weight
 */
export function normalizeWeight(weight: BrokenBulk): string | undefined {
    if (weight === null || weight === undefined) {
        return undefined;
    }
    // turn numbers into strings
    const stringWeight = `${weight}`;
    return stringWeight.toLowerCase().trim();
}

/**
 * @param item
 * @param nestedItems
 * @return
 */
export function toBulkItem(item: PhysicalItemData, nestedItems: BulkItem[] = []): BulkItem {
    const id = item._id;
    const weight = item.data?.weight?.value;
    const quantity = item.data?.quantity?.value ?? 0;
    const isEquipped = item.data?.equipped?.value ?? false;
    const equippedBulk = item.data?.equippedBulk?.value;
    const unequippedBulk = item.data?.unequippedBulk?.value;
    const stackGroup = item.data?.stackGroup?.value;
    const negateBulk = item.data?.negateBulk?.value;
    const extraDimensionalContainer = item.data?.traits?.value?.includes('extradimensional') ?? false;

    return new BulkItem({
        id,
        bulk: weightToBulk(normalizeWeight(weight)) ?? new Bulk(),
        negateBulk: weightToBulk(normalizeWeight(negateBulk)) ?? new Bulk(),
        // this stuff overrides bulk so we don't want to default to 0 bulk if undefined
        unequippedBulk: weightToBulk(normalizeWeight(unequippedBulk)),
        equippedBulk: weightToBulk(normalizeWeight(equippedBulk)),
        holdsItems: nestedItems,
        stackGroup,
        isEquipped,
        quantity,
        extraDimensionalContainer,
    });
}

/**
 * Recursively build items by checking if groupedItems contains a list
 * under their data._id
 * @param items
 * @param groupedItems items grouped by data.containerId.value
 * @return
 */
function buildContainerTree(items: PhysicalItemData[], groupedItems: Map<string, PhysicalItemData[]>): BulkItem[] {
    return items.map((item) => {
        const itemId = item._id;
        if (itemId !== null && itemId !== undefined && groupedItems.has(itemId)) {
            const itemsInContainer = buildContainerTree(groupedItems.get(itemId), groupedItems);
            return toBulkItem(item, itemsInContainer);
        }
        return toBulkItem(item);
    });
}

/**
 * Items that reference other others need to be nested into them. If an item has a reference
 * to an id, it should be nested into that container unless the container with that id does
 * not exist.
 *
 * All other items are top level items.
 * @param items
 * @return
 */
export function toBulkItems(items: PhysicalItemData[]): BulkItem[] {
    const allIds = new Set(items.map((item) => item._id));
    const itemsInContainers = groupBy(items, (item) => {
        // we want all items in the top level group that are in no container
        // or are never referenced because we don't want the items to
        // disappear if the container is being deleted or doesn't have a reference
        const ref = item.data?.containerId?.value ?? null;
        if (ref === null || !allIds.has(ref)) {
            return null;
        }
        return ref;
    });
    if (itemsInContainers.has(null)) {
        const topLevelItems = itemsInContainers.get(null);
        return buildContainerTree(topLevelItems, itemsInContainers);
    }
    return [];
}

/**
 * Takes actor data and returns a list of items to calculate bulk with
 * @param actorData
 */
export function itemsFromActorData(actorData: { items: ItemData[] }): BulkItem[] {
    return toBulkItems(actorData.items.filter(isPhysicalItem));
}

/**
 * Carried armor usually has one more bulk when not worn, or 1 bulk if L
 * @param wornBulk
 * @return
 */
export function calculateCarriedArmorBulk(wornBulk: BrokenBulk): string {
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
 * @return
 */
export function fixWeight(brokenWeight: BrokenBulk): string | null {
    const bulk = weightToBulk(normalizeWeight(brokenWeight)) ?? new Bulk();
    if (bulk.light === 1) {
        return 'l';
    }
    if (bulk.normal > 0) {
        return `${bulk.normal}`;
    }
    return null;
}

/**
 * Fill in nodes recursively indexed by id
 * @param bulkItem
 * @param resultMap
 */
function fillBulkIndex(bulkItem: BulkItem, resultMap: Map<string, BulkItem>): void {
    resultMap.set(bulkItem.id, bulkItem);
    bulkItem.holdsItems.forEach((heldBulkItem) => fillBulkIndex(heldBulkItem, resultMap));
}

/**
 * Walk the bulk items tree and create a Map for quick lookups
 * @param bulkItems first item is always the inventory, so unpack that first
 */
export function indexBulkItemsById(bulkItems: BulkItem[] = []): Map<string, BulkItem> {
    const result = new Map();
    bulkItems.forEach((bulkItem) => fillBulkIndex(bulkItem, result));
    return result;
}
