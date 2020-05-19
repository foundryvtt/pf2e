import { weightToBulk, toBulkItems, calculateBulk, formatBulk, Bulk } from './bulk.js';
import { groupBy } from '../utils.js';

export function isContainer(item) {
    const capacity = item.data?.bulkCapacity?.value;
    const bulk = weightToBulk(capacity);
    return bulk?.isPositive() ?? false;
}

export function getHeldItems(id, items = []) {
    return items.filter(item => item?.data?.containerId?.value === id);
}

export class Container {
    constructor(item, heldItems, negateBulk, capacity, heldItemBulk, formattedNegateBulk, formattedHeldItemBulk) {
        this.item = item;
        this.heldItems = heldItems;
        this.negateBulk = negateBulk;
        this.heldItemBulk = heldItemBulk;
        this.formattedHeldItemBulk = formattedHeldItemBulk;
        this.formattedNegateBulk = formattedNegateBulk;
        this.capacity = capacity;
    }
    
    get isContainer() {
        return !this.capacity.isNegligible;
    }
}

export function getContainerWeight(item, items, stackDefinitions, bulkConfig) {
    const heldItems = getHeldItems(item._id, items);
    const bulkItems = toBulkItems(heldItems);
    return calculateBulk(bulkItems, stackDefinitions, false, bulkConfig)[0];
}

export function getNegateBulk(item) {
    const negateBulk = item.data?.negateBulk?.value;
    return weightToBulk(negateBulk) ?? new Bulk();
}

function getCapacity(item) {
    const bulkCapacity = item.data?.bulkCapacity?.value;
    return weightToBulk(bulkCapacity) ?? new Bulk();
}

function toContainer(item, heldItems = [], stackDefinitions, bulkConfig) {
    const negateBulk = getNegateBulk(item);
    const heldItemBulk = getContainerWeight(item, heldItems, stackDefinitions, bulkConfig);
    const maximumBulk = getCapacity(item);
    return new Container(
        item, 
        heldItems,
        negateBulk,
        maximumBulk,
        heldItemBulk,
        formatBulk(negateBulk),
        formatBulk(heldItemBulk),
    )
}

export function getContainerMap(items = [], stackDefinitions, bulkConfig) {
    const allIds = groupBy(items, item => item._id);
    
    const containerGroups = groupBy(items, item => {
        const containerId = item?.data?.containerId?.value;
        if (allIds.has(containerId)) {
            return containerId;
        }
        return null;
    });
    
    const containers = new Map();
    items
        .map(item => {
            const itemId = item._id;
            if (containerGroups.has(itemId)) {
                return [itemId, containerGroups.get(itemId)];
            }
            return [itemId, []];
        })
        .forEach(([id, heldItems]) => {
            containers.set(id, toContainer(allIds.get(id), heldItems, stackDefinitions, bulkConfig));    
        })
    
    return {
        nonContainerItems: containerGroups.get(null) || [],
        containers,
    };
}
