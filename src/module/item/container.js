import { Bulk, calculateBulk, formatBulk, weightToBulk } from './bulk.js';
import { groupBy } from '../utils.js';

/**
 * Datatype that holds container information for *every* item, even non containers
 */
class ContainerData {
    constructor({
        item,
        heldItems,
        negateBulk,
        capacity,
        heldItemBulk,
        isInContainer,
        formattedNegateBulk,
        formattedHeldItemBulk,
        formattedCapacity,
    }) {
        this.item = item;
        this.heldItems = heldItems;
        this.negateBulk = negateBulk;
        this.heldItemBulk = heldItemBulk;
        this.isInContainer = isInContainer;
        this.formattedHeldItemBulk = formattedHeldItemBulk;
        this.formattedNegateBulk = formattedNegateBulk;
        this.formattedCapacity = formattedCapacity;
        this.capacity = capacity;
    }

    get isContainer() {
        return !this.capacity.isNegligible;
    }

    get isNotInContainer() {
        return !this.isInContainer;
    }
}

/**
 * Creates container meta data
 * @param item
 * @param heldItems
 * @param heldBulkItems
 * @param isInContainer
 * @param stackDefinitions
 * @param bulkConfig
 * @return {ContainerData}
 */
function toContainer(item, heldItems = [], heldBulkItems = [], isInContainer, stackDefinitions, bulkConfig) {
    const negateBulk = weightToBulk(item.data?.negateBulk?.value) ?? new Bulk();
    const [heldItemBulk] = calculateBulk(heldBulkItems, stackDefinitions, false, bulkConfig);
    const capacity = weightToBulk(item.data?.bulkCapacity?.value) ?? new Bulk();
    return new ContainerData({
        item,
        heldItems,
        negateBulk,
        capacity,
        heldItemBulk,
        isInContainer,
        formattedNegateBulk: formatBulk(negateBulk),
        formattedHeldItemBulk: formatBulk(heldItemBulk),
        formattedCapacity: formatBulk(capacity),
    });
}

/**
 * Fill in nodes recursively indexed by id
 * @param bulkItem
 * @param resultMap
 */
function fillBulkIndex(bulkItem, resultMap) {
    resultMap.set(bulkItem.id, bulkItem);
    bulkItem.holdsItems.forEach(heldBulkItem => fillBulkIndex(heldBulkItem, resultMap));
}

/**
 * Walk the bulk items tree and create a Map for quick lookups
 * @param bulkItems first item is always the inventory, so unpack that first
 */
function indexBulkItems(bulkItems = []) {
    const result = new Map();
    bulkItems.forEach(bulkItem => fillBulkIndex(bulkItem, result));
    return result;
}

export function getContainerMap(items = [], bulkItems = [], stackDefinitions, bulkConfig) {
    const allIds = groupBy(items, item => item._id);
    const indexedBulkItems = indexBulkItems(bulkItems);

    const containerGroups = groupBy(items, item => {
        const containerId = item?.data?.containerId?.value;
        if (allIds.has(containerId)) {
            return containerId;
        }
        return null;
    });

    const idIndexedContainerData = new Map();
    items
        .map(item => {
            const itemId = item._id;
            const isInContainer = containerGroups.has(item?.data?.containerId?.value);
            if (containerGroups.has(itemId)) {
                return [itemId, containerGroups.get(itemId), isInContainer];
            }
            return [itemId, [], isInContainer];
        })
        .forEach(([id, heldItems, isInContainer]) => {
            idIndexedContainerData.set(id, toContainer(
                allIds.get(id)[0],
                heldItems,
                indexedBulkItems.get(id)?.holdsItems ?? [],
                isInContainer,
                stackDefinitions,
                bulkConfig
            ));
        });

    return idIndexedContainerData;
}
