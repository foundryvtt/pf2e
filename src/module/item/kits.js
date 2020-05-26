/**
 * The kit key is the item's compendium id.
 *
 * The value is an array of CompendiumReference, that hold compendium ids that
 * should be added to the inventory.
 *
 * These compendium ids can be kit ids as well.
 *
 * You can override the quantity by providing it in the quantity attribute, otherwise
 * it will use the quantity in the compendium.
 *
 * If the compendium id is a container, you can nest objects into it by
 * setting the holdsItems attribute to an array of CompendiumReference objects.
 *
 * @type {Map<string, CompendiumReference>}
 */
const kits = new Map();

class CompendiumReference {
    /**
     * @param {string} id
     * @param {number} quantity
     * @param {CompendiumReference[]} holdsItems
     */
    constructor({ id, quantity, holdsItems = [] } = {}) {
        this.id = id;
        this.quantity = quantity;
        this.holdsItems = holdsItems;
    }
}

// adventurer's pack
kits.set('rxXT8KPBXa08feFD', [
    // backpack
    new CompendiumReference({
        id: '3lgwjrFEsQVKzhh7',
        holdsItems: [
            // bedroll
            new CompendiumReference({ id: 'fagzYdmfYyMQ6J77' }),
            // 10 pieces chalk
            new CompendiumReference({
                id: 'xShIDyydOMkGvGNb',
                quantity: 10
            }),
            // flint and steel
            new CompendiumReference({ id: 'UlIxxLm71UdRgCFE' }),
            // 50ft rope
            new CompendiumReference({ id: 'fyYnQf1NAx9fWFaS' }),
            // 2 weeks rations
            new CompendiumReference({
                id: 'L9ZV076913otGtiB',
                quantity: 14
            }),
            // soap
            new CompendiumReference({ id: '81aHsD27HFGnq1Nt' }),
            // 5 torches
            new CompendiumReference({
                id: '8Jdw4yAzWYylGePS',
                quantity: 5
            }),
            // waterskin
            new CompendiumReference({ id: 'VnPh324pKwd2ZB66' }),
        ],
    }),
    // belt pouch
    new CompendiumReference({ id: 'eFqKVKrf62XOGWUw' }),
    new CompendiumReference({ id: 'eFqKVKrf62XOGWUw' }),
]);

/**
 * @param {string} itemId
 * @return {boolean}
 */
export function isKit(itemId) {
    return kits.has(itemId);
}

async function createKitItem(item, createItem, containerId) {
    const itemId = item.id;
    if (kits.has(itemId)) {
        await createKitItem(itemId, createItem);
    } else {
        const createItemId = await createItem(itemId, containerId, item.quantity);
        for (const heldItem of item.holdsItems ?? []) {
            // eslint-disable-next-line no-await-in-loop
            await createKitItem(heldItem, createItem, createItemId);
        }
    }
}

/**
 * @callback createItemCallback
 * @param {string} itemId
 * @param {?string} containerId
 * @param {?number} quantity
 */

/**
 * @param {string} itemId
 * @param {createItemCallback} createItem
 * @return {Promise<void>}
 */
export async function addKit(itemId, createItem) {
    for (const item of kits.get(itemId)) {
        // eslint-disable-next-line no-await-in-loop
        await createKitItem(item, createItem);
    }
}