import {Bulk, calculateBulk, formatBulk, weightToBulk} from './bulk.js';
import {groupBy} from '../utils.js';

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

    get isCollapsed() {
        return this.item?.data?.collapsed?.value ?? false;
    }
    
    get isNotInContainer() {
        return !this.isInContainer;
    }

    _getLightBulkCapacityThreshold() {
        if (this.capacity.normal > 0) {
            // light bulk don't count towards bulk limit
            return this.capacity.toLightBulk() + 10;
        }
        // but do if the container only stores light bulk
        return this.capacity.light;
    }

    get fullPercentage() {
        const capacity = this._getLightBulkCapacityThreshold();
        if (capacity === 0) {
            return 0;
        }
        const heldLightBulk = this.heldItemBulk.toLightBulk();
        return Math.floor((heldLightBulk / capacity) * 100);
    }
    
    get fullPercentageMax100() {
        const percentage = this.fullPercentage;
        if (percentage > 100) {
            return 100;
        }
        return percentage;
    }

    get isOverLoaded() {
        if (this.capacity.normal > 0) {
            return this.heldItemBulk.toLightBulk() >= (this.capacity.toLightBulk() + 10);
        }
        return this.heldItemBulk.toLightBulk() > this.capacity.light;
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

function detectCycle(itemId, containerId, idIndexedItems) {
    if (idIndexedItems.has(containerId)) {
        const currentItem = idIndexedItems.get(containerId);
        if (itemId === currentItem._id) {
            return true;
        } else {
            return detectCycle(itemId, currentItem?.data?.containerId?.value, idIndexedItems);
        }
    } else {
        return false;
    }
}

/**
 * Detect if a new container id would produce a cycle
 * @param itemId
 * @param containerId
 * @param items
 * @returns {boolean}
 */
export function isCycle(itemId, containerId, items) {
    const idIndexedItems = new Map();
    for (const item of items) {
        idIndexedItems.set(item._id, item);
    }
    return detectCycle(itemId, containerId, idIndexedItems);
}

/**
 * Returns a map where the key is an item id and the value is the container data.
 * Every item has container data, even if it's not a container. The relevant
 * values for non container items are just empty in that case. This is useful
 * in the templates, because you don't have a lot of leeway there
 * @param items all items on the actor
 * @param bulkItemsById all items on the actor transformed into bulk items; used to look up how much bulk a container stores
 * @param stackDefinitions used to calculated bulk
 * @param bulkConfig used to calculated bulk
 * @return {Map<string, ContainerData>}
 */
// eslint-disable-next-line import/prefer-default-export
export function getContainerMap(items = [], bulkItemsById = new Map(), stackDefinitions, bulkConfig) {
    const allIds = groupBy(items, item => item._id);

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
                bulkItemsById.get(id)?.holdsItems ?? [],
                isInContainer,
                stackDefinitions,
                bulkConfig
            ));
        });

    return idIndexedContainerData;
}
