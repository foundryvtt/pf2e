import type { ContainerPF2e, PhysicalItemPF2e } from "@item";
import { Size, SIZES } from "@module/data";
import { add, applyNTimes, combineObjects, groupBy, isBlank, Optional } from "@util";
import { ItemDataPF2e, PhysicalItemData } from "../data";
import { isPhysicalData } from "../data/helpers";
import { isEquipped } from "./usage";

interface StackDefinition {
    size: number;
    lightBulk: number;
}

type StackDefinitions = Record<string, StackDefinition | undefined>;

/**
 * hard coded for now but could be made configurable later on.
 * Describes each stack group by how much items belong in a stack
 * and how much bulk a single stack produces. Bulk type has to be
 * included because coins don't add light bulk below 1000, just 1
 * bulk per 1000 coins
 */
export const stackDefinitions: StackDefinitions = {
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
    woodenTaws: {
        size: 10,
        lightBulk: 1,
    },
    rounds5: {
        size: 5,
        lightBulk: 1,
    },
    rounds10: {
        size: 10,
        lightBulk: 1,
    },
    rations: {
        size: 7,
        lightBulk: 1,
    },
    sacks: {
        size: 5,
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

export interface BulkBehavior {
    bulk: Bulk;
    per: number;
    stackGroup: string | null;
}

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
        // An item that would have its Bulk reduced below 1 has light Bulk.
        const normal = this.normal * factor;
        const lightCarryOver = normal < 1 && normal > 0 ? 1 : 0;
        const light = Math.floor(this.light * factor) + lightCarryOver;
        return new Bulk({
            normal: Math.floor(normal),
            light,
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

    double(): Bulk {
        if (this.isNegligible) {
            return new Bulk({ light: 1 });
        } else if (this.isLight) {
            return this.times(10);
        } else {
            return this.times(2);
        }
    }

    halve(): Bulk {
        if (this.isNegligible) {
            return new Bulk();
        } else if (this.isLight) {
            return new Bulk();
        } else if (this.normal === 1) {
            return new Bulk({ light: 1 });
        } else {
            return this.times(0.5);
        }
    }
}

/**
 * See https://2e.aonprd.com/Rules.aspx?ID=258 and https://2e.aonprd.com/Rules.aspx?ID=257 are fundamentally
 * at odds with each other and there is no way to implement this RAW
 *
 * RAI:
 * "Because the way that a creature treats Bulk and the Bulk of gear sized for it scale the same way,
 * Tiny or Large (or larger) creatures can usually wear and carry about the same amount of appropriately
 * sized gear as a Medium creature."
 *
 * Looking at table 6-20 the following rules can be deduced:
 * if item size < creature size:
 * for each step until you reach the target size halve bulk
 * 1 bulk halved becomes L bulk
 * L bulk halved becomes negligible bulk
 *
 * if item size > creature size:
 * for each step until you reach the target size double bulk
 * L bulk doubled becomes 1 bulk
 * negligible bulk doubled becomes L bulk unless it's a tiny item, then it stays at negligible bulk
 *
 * ignore everything else
 *
 * @param bulk
 * @param itemSize
 * @param actorSize
 */
export function convertBulkToSize(bulk: Bulk, itemSize: Size, actorSize: Size): Bulk {
    const sizes = Array.from(SIZES).filter((size) => size !== "sm");
    const itemSizeIndex = sizes.indexOf(itemSize === "sm" ? "med" : itemSize);
    const actorSizeIndex = sizes.indexOf(actorSize === "sm" ? "med" : actorSize);

    if (itemSizeIndex === actorSizeIndex) {
        return bulk;
    } else if (itemSizeIndex > actorSizeIndex) {
        return applyNTimes((bulk) => bulk.double(), itemSizeIndex - actorSizeIndex, bulk);
    } else {
        return applyNTimes((bulk) => bulk.halve(), actorSizeIndex - itemSizeIndex, bulk);
    }
}

/** Produces strings like: "-", "L", "2L", "3", "3; L", "4; 3L" to display bulk in the frontend bulk column */
export function formatBulk(bulk: Bulk): string {
    if (bulk.normal === 0 && bulk.light === 0) {
        return "-";
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

    size: Size;

    quantity: number;

    stackGroup: string | null;

    isEquipped: boolean;

    unequippedBulk?: Bulk;

    equippedBulk?: Bulk;

    holdsItems: BulkItem[];

    negateBulk: Bulk;

    extraDimensionalContainer: boolean;

    constructor({
        id = "",
        bulk = new Bulk(),
        quantity = 1,
        stackGroup = null,
        isEquipped = false,
        // value to overrides bulk field when unequipped
        unequippedBulk,
        // value to overrides bulk field when equipped
        equippedBulk,
        holdsItems = [],
        // some containers like a backpack or back of holding reduce total bulk if
        // items are put into it
        negateBulk = new Bulk(),
        // extra dimensional containers cease to work when nested inside each other
        extraDimensionalContainer = false,
        size = "med",
    }: {
        id?: string;
        bulk?: Bulk;
        quantity?: number;
        stackGroup?: string | null;
        isEquipped?: boolean;
        unequippedBulk?: Bulk;
        equippedBulk?: Bulk;
        holdsItems?: BulkItem[];
        negateBulk?: Bulk;
        extraDimensionalContainer?: boolean;
        size?: Size;
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
        this.size = size;
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

/**
 * Calculates the bulk for stacks of ammunition, coins and rations;
 * Returns the remainders as overflow for further calculation
 * @param itemStacks and object containing the stack name as key and quantity as value
 * @param actorSize
 * @param itemSize
 * @return
 */
function calculateStackBulk({
    itemStacks,
    actorSize,
    itemSize,
}: {
    itemStacks: Record<string, number>;
    actorSize: Size;
    itemSize: Size;
}): BulkAndOverflow {
    return Object.entries(itemStacks)
        .map(([stackType, quantity]) => {
            if (!(stackType in stackDefinitions)) {
                console.warn(`No stack definition found for stack ${stackType}`);
                stackType = "arrows";
            }
            const { size, lightBulk } = stackDefinitions[stackType] ?? { size: 10, lightBulk: 1 };
            const bulkRelevantQuantity = Math.floor(quantity / size);
            // if is needed because negligible bulk can indeed become bulk if its size increases
            const itemBulk =
                bulkRelevantQuantity > 0
                    ? convertBulkToSize(new Bulk({ light: bulkRelevantQuantity * lightBulk }), itemSize, actorSize)
                    : new Bulk();
            const overflow = { [stackType]: quantity % size };
            const result: BulkAndOverflow = [itemBulk, overflow];
            return result;
        })
        .reduce(combineBulkAndOverflow, [new Bulk(), {}]);
}

function calculateItemBulk({ item, actorSize }: { item: BulkItem; actorSize: Size }): BulkAndOverflow {
    // ignore containers that aren't items
    if (item.id === "") {
        return [new Bulk(), {}];
    }
    const stackName = item.stackGroup;
    if (isBlank(stackName)) {
        const bulk = calculateNonStackBulk(item);
        return [convertBulkToSize(bulk, item.size, actorSize).times(item.quantity), {}];
    }

    return calculateStackBulk({ itemStacks: { [stackName]: item.quantity }, itemSize: item.size, actorSize });
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

/** Stacks don't overflow if inside extra dimensional containers or overflowing bulk is turned off */
function calculateChildOverflow(overflow: StackGroupOverflow, item: BulkItem): StackGroupOverflow {
    if (item.extraDimensionalContainer) {
        return {};
    }
    return overflow;
}

/**
 * Calculate the bulk for an item and it's held items.
 * @return
 */
function calculateCombinedBulk({
    item,
    nestedExtraDimensionalContainer = false,
    actorSize,
}: {
    item: BulkItem;
    nestedExtraDimensionalContainer: boolean;
    actorSize: Size;
}): BulkAndOverflow {
    const [mainBulk, mainOverflow] = calculateItemBulk({ item, actorSize });
    const [childBulk, childOverflow] = item.holdsItems
        .map((child) =>
            calculateCombinedBulk({
                item: child,
                nestedExtraDimensionalContainer: item.extraDimensionalContainer,
                actorSize,
            })
        )
        .reduce(combineBulkAndOverflow, [new Bulk(), {}]);

    // combine item overflow and child overflow
    const combinedOverflow = combineObjects(mainOverflow, calculateChildOverflow(childOverflow, item), add);
    const [overflowBulk, remainingOverflow] = calculateStackBulk({
        itemStacks: combinedOverflow,
        actorSize,
        itemSize: item.size,
    });
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
 * @param nestedExtraDimensionalContainer true if you have a bag of holding inside a bag of holding
 * only the first bag of holding reduces bulk, the nested one stops working as per RAW
 * @param actorSize
 * @return
 */
export function calculateBulk({
    items = [],
    nestedExtraDimensionalContainer = false,
    actorSize = "med",
}: {
    items?: BulkItem[];
    nestedExtraDimensionalContainer?: boolean;
    actorSize?: Size;
} = {}): BulkAndOverflow {
    const inventory = new BulkItem({
        holdsItems: items,
    });
    return calculateCombinedBulk({
        item: inventory,
        nestedExtraDimensionalContainer,
        actorSize,
    });
}

const lightBulkRegex = /^(\d*)l$/i;
const complexBulkRegex = /^(\d+);\s*(\d*)l$/i;

/**
 * Accepted formats:
 * "l", "1", "L", "1; L", "2; 3L", "2;3L"
 * @param weight if not parseable will return null or undefined
 */
export function weightToBulk(weight: Optional<string | number>): Bulk | undefined {
    if (weight === undefined || weight === null) {
        return undefined;
    }
    const trimmed = String(weight).trim();
    if (/^\d+$/.test(trimmed)) {
        return new Bulk({ normal: parseInt(trimmed, 10) });
    }
    const lightMatch = trimmed.match(lightBulkRegex);
    if (lightMatch) {
        return new Bulk({ light: parseInt(lightMatch[1] || "1", 10) });
    }
    const complexMatch = trimmed.match(complexBulkRegex);
    if (complexMatch) {
        const [, normal, light] = complexMatch;
        return new Bulk({
            normal: parseInt(normal, 10),
            light: parseInt(light || "1", 10),
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

export function toBulkItem(itemData: PhysicalItemData, nestedItems: BulkItem[] = []): BulkItem {
    const id = itemData._id;
    const weight = itemData.data?.weight?.value;
    const quantity = itemData.data?.quantity ?? 0;
    const equippedBulk = itemData.data?.equippedBulk?.value;
    const unequippedBulk = itemData.data?.unequippedBulk?.value;
    const stackGroup = itemData.data.stackGroup;
    const negateBulk = itemData.data.negateBulk?.value;
    const traits: string[] = itemData.data.traits.value;
    const extraDimensionalContainer = traits.includes("extradimensional");
    const size = itemData.data.size || "med";

    return new BulkItem({
        id,
        bulk: weightToBulk(normalizeWeight(weight)) ?? new Bulk(),
        negateBulk: weightToBulk(normalizeWeight(negateBulk)) ?? new Bulk(),
        // this stuff overrides bulk so we don't want to default to 0 bulk if undefined
        unequippedBulk: weightToBulk(normalizeWeight(unequippedBulk)),
        equippedBulk: weightToBulk(normalizeWeight(equippedBulk)),
        holdsItems: nestedItems,
        stackGroup,
        isEquipped: isEquipped(itemData.data.usage, itemData.data.equipped),
        quantity,
        extraDimensionalContainer,
        size,
    });
}

/**
 * Recursively build items by checking if groupedItems contains a list
 * under their data._id
 * @param items
 * @param groupedItems items grouped by data.containerId
 * @return
 */
function buildContainerTree(
    items: PhysicalItemData[],
    groupedItems: Map<string | null, PhysicalItemData[]>
): BulkItem[] {
    return items.map((item) => {
        const containedItems = groupedItems.get(item._id);
        if (containedItems) {
            const itemsInContainer = buildContainerTree(containedItems, groupedItems);
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
        const ref = item.data.containerId ?? null;
        if (ref === null || !allIds.has(ref)) {
            return null;
        }
        return ref;
    });
    const topLevelItems = itemsInContainers.get(null);
    if (topLevelItems) {
        return buildContainerTree(topLevelItems, itemsInContainers);
    }
    return [];
}

/**
 * Takes actor data and returns a list of items to calculate bulk with
 * @param actorData
 */
export function itemsFromActorData(actorData: { items: ItemDataPF2e[] }): BulkItem[] {
    return toBulkItems(actorData.items.filter((itemData): itemData is PhysicalItemData => isPhysicalData(itemData)));
}

/**
 * Carried armor usually has one more bulk when not worn, or 1 bulk if L
 * @param wornBulk
 * @return
 */
export function calculateCarriedArmorBulk(wornBulk: BrokenBulk): string {
    const bulk = weightToBulk(normalizeWeight(wornBulk)) ?? new Bulk();
    if (bulk.light === 1) {
        return "1";
    }
    if (bulk.normal > 0) {
        return `${bulk.normal + 1}`;
    }
    return "-";
}

/**
 * Fix previous borked weight
 * @param brokenWeight
 * @return
 */
export function fixWeight(brokenWeight: BrokenBulk): string | null {
    const bulk = weightToBulk(normalizeWeight(brokenWeight)) ?? new Bulk();
    if (bulk.light === 1) {
        return "l";
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

/** Returns true if any of the item's container ancestry is extradimensional */
export function hasExtraDimensionalParent(item: ContainerPF2e, encountered = new Set<string>()): boolean {
    // Check for cyclical reference
    if (encountered.has(item.id)) return false;
    encountered.add(item.id);

    const parent = item.container;
    if (!parent) return false;
    if (parent.traits.has("extradimensional")) return true;
    encountered.add(parent.id);
    return hasExtraDimensionalParent(parent);
}

export function computeTotalBulk(items: PhysicalItemPF2e[]) {
    // Figure out which items have stack groups and which don't
    const nonStackingItems = items.filter((i) => i.isOfType("backpack") || !i.bulkBehavior.stackGroup);
    const nonStackingIds = new Set(nonStackingItems.map((item) => item.id));
    const stackingItems = items.filter((item) => !nonStackingIds.has(item.id));

    // Compute non-stacking bulks
    const baseBulk = nonStackingItems
        .map((item) => item.totalBulk)
        .reduce((first, second) => first.plus(second), new Bulk());

    // Group by stack group, then combine into quantities, then compute bulk from combined quantities
    type BulkBehaviorQuantity = BulkBehavior & { quantity: number };
    const stackingBehaviors = stackingItems.map((item) => ({ ...item.bulkBehavior, quantity: item.quantity }));
    const groupedBehaviors = stackingBehaviors.reduce((result: Record<string, BulkBehaviorQuantity>, behavior) => {
        if (!behavior.stackGroup) return result;

        if (behavior.stackGroup in result) {
            result[behavior.stackGroup].quantity += behavior.quantity;
        } else {
            result[behavior.stackGroup] = behavior;
        }

        return result;
    }, {});
    const bulks = Object.values(groupedBehaviors).map((behavior) =>
        behavior.bulk.times(Math.floor(behavior.quantity / behavior.per))
    );

    // Combine non-stacking and stacking bulks together
    return baseBulk.plus(bulks.reduce((first, second) => first.plus(second), new Bulk()));
}
