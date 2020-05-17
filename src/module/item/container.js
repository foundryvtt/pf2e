import { weightToBulk, toBulkItems, calculateBulk } from './bulk.js';

export function isContainer(item) {
    const capacity = item.data?.bulkCapacity?.value;
    const bulk = weightToBulk(capacity);
    return bulk?.isPositive() ?? false;
}

export function getHeldItems(id, items = []) {
    return items.filter(item => item?.data?.containerId?.value === id);
}

export function getNonContainerItems(items = []) {
    const allIds = new Set(items.map(item => item._id));
    return items.filter(item => allIds.has(item?.data?.containerId?.value));
}

export function getContainerWeight(item, items, stackDefinitions, bulkConfig) {
    const heldItems = getHeldItems(item._id, items);
    const bulkItems = toBulkItems(heldItems);
    return calculateBulk(bulkItems, stackDefinitions, false, bulkConfig)[0];
}

export function getNegateBulk(item) {
    const negateBulk = item.data?.negateBulk?.value;
    return  weightToBulk(negateBulk);
}