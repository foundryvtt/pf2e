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
 * @type {Map<string, CompendiumReference[]>}
 */
import { coinCompendiumIds } from './treasure.js';

const kits = new Map();

class CompendiumReference {
    /**
     * @param {string} id
     * @param {number=} quantity
     * @param {CompendiumReference[]} holdsItems
     */
    constructor({ id, quantity, holdsItems = [] } = {}) {
        this.id = id;
        this.quantity = quantity;
        this.holdsItems = holdsItems;
    }
}

// adventurer's pack
const adventurersPackId = 'rxXT8KPBXa08feFD';
kits.set(adventurersPackId, [
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
 * @param {number} gp
 * @param {number} sp
 * @return {CompendiumReference[]}
 */
function treasure(gp = 0, sp = 0, cp = 0) {
    return [
        new CompendiumReference({
            id: coinCompendiumIds.gp,
            quantity: gp
        }),
        new CompendiumReference({
            id: coinCompendiumIds.sp,
            quantity: sp
        }),
        new CompendiumReference({
            id: coinCompendiumIds.cp,
            quantity: cp
        }),
    ].filter(ref => ref.quantity !== 0);
}

const studdedArmorId = 'ewQZ0VeL38v3qFnN';
const slingBulletId = 'MKSeXwUm56c15MZa';
const daggerId = 'rQWaJhI5Bko5x14Z';
const slingId = 'UCH4myuFnokGv0vF';
const caltropId = '7fSnvJ2xoSfa6JXD';
const alchemistsToolsId = '4ftXXUCBHcf4b0MH';
const bandolierId = 'HamOU17sqb5ljiB5';
const craftersBookId = 'w4Hd6nunVVqw3GWj';
const sheathId = 'Zycu6zaGvDsqLH5g';
const hideArmorId = 'AnwzlOs0njF9Jqnr';
const javelinId = 'JNt7GmLCCVz5BiEI';
const grapplingHookId = '6DCy7tEF1cxaIJMy';
const rapierId = 'tH5GirEy7YB3ZgCk';
const musicalInstrumentId = 'MPv5Yx4w7scZGj2Y';
const crowbarId = '44F1mfJei4GY8f2X';
const religiousSymbolId = 'plplsXJsqrdqNQVI';
const leatherArmorId = 'M8z72tZUYe7KPclQ';
const longspearId = 'aXuJh4i8HqSu6NYV';
const hollyAndMistletoeId = 'QbOlqr4lSkeOEfty';
const staffId = 'FVjTuBCIefAgloUU';
const climbingKitId = '9UJbMaglf35GVzaZ';
const smokestickId = 'MoBlVd36uD9xVvZC';
const arrowsId = 'w2ENw2VMPcsbif8g';
const longbowId = 'MVAWttmT0QDa7LsV';
const materialPouchId = 'VHxXMvBeBTq2FSdf';
const writingSetId = 'QJb8S927Yj81EgHH';

// alchemist kit
kits.set('rdHcMXw4DMOL8IYu', [
    ...treasure(9, 4),
    new CompendiumReference({id: studdedArmorId}),
    new CompendiumReference({id: slingBulletId, quantity: 20}),
    new CompendiumReference({id: daggerId}),
    new CompendiumReference({id: slingId}),
    new CompendiumReference({id: caltropId, quantity: 2}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: alchemistsToolsId}),
    new CompendiumReference({id: bandolierId}),
    new CompendiumReference({id: craftersBookId}),
    new CompendiumReference({id: sheathId}),
]);
// barbarian kit
kits.set('ms8FwuEvsUzwT8q0', [
    ...treasure(11, 8),
    new CompendiumReference({id: hideArmorId}),
    new CompendiumReference({id: javelinId, quantity: 4}),
    new CompendiumReference({id: sheathId, quantity: 2}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: grapplingHookId}),
]);
// bard kit
kits.set('A1gRqfmEx2zdhd6J', [
    ...treasure(8, 2),
    new CompendiumReference({id: studdedArmorId}),
    new CompendiumReference({id: slingBulletId, quantity: 20}),
    new CompendiumReference({id: daggerId}),
    new CompendiumReference({id: rapierId}),
    new CompendiumReference({id: slingId}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: bandolierId}),
    new CompendiumReference({id: musicalInstrumentId}),
    new CompendiumReference({id: sheathId}),
]);
// champion kit
kits.set('AbxSVrDbnHS0hU3S', [
    ...treasure(11, 2),
    new CompendiumReference({id: hideArmorId}),
    new CompendiumReference({id: javelinId, quantity: 4}),
    new CompendiumReference({id: daggerId}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: crowbarId}),
    new CompendiumReference({id: grapplingHookId}),
    new CompendiumReference({id: sheathId}),
]);
// cleric kit
kits.set('f1l10jVFkdWqiXRB', [
    ...treasure(13),
    new CompendiumReference({id: caltropId, quantity: 2}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: bandolierId}),
    new CompendiumReference({id: religiousSymbolId}),
]);
// druid kit
kits.set('qHVFOTVFHEK662E0', [
    ...treasure(11, 3),
    new CompendiumReference({id: leatherArmorId}),
    new CompendiumReference({id: javelinId, quantity: 4}),
    new CompendiumReference({id: longspearId}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: bandolierId}),
    new CompendiumReference({id: hollyAndMistletoeId}),
]);
// fighter kit
kits.set('yE959HPiyGw9FxAM', [
    ...treasure(12),
    new CompendiumReference({id: hideArmorId}),
    new CompendiumReference({id: daggerId}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: grapplingHookId}),
    new CompendiumReference({id: sheathId}),
]);
// monk kit
kits.set('0f3l3Dq2xJek2UMZ', [
    ...treasure(10, 2),
    new CompendiumReference({id: longspearId}),
    new CompendiumReference({id: staffId}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: bandolierId}),
    new CompendiumReference({id: climbingKitId}),
    new CompendiumReference({id: grapplingHookId}),
    new CompendiumReference({id: smokestickId}),
]);
// ranger kit
kits.set('hkMG8iNdSgofrPve', [
    ...treasure(5, 9),
    new CompendiumReference({id: leatherArmorId}),
    new CompendiumReference({id: arrowsId, quantity: 20}),
    new CompendiumReference({id: daggerId}),
    new CompendiumReference({id: longbowId}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: sheathId}),
]);
// rogue kit
kits.set('MARsStNVQdc4DRCV', [
    ...treasure(9, 6),
    new CompendiumReference({id: leatherArmorId}),
    new CompendiumReference({id: daggerId}),
    new CompendiumReference({id: rapierId}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: climbingKitId}),
    new CompendiumReference({id: sheathId}),
]);
// sorcerer kit
kits.set('edXxkkY3tgX7GLGI', [
    ...treasure(13, 3, 7),
    new CompendiumReference({id: slingBulletId, quantity: 20}),
    new CompendiumReference({id: daggerId}),
    new CompendiumReference({id: slingId}),
    new CompendiumReference({id: caltropId, quantity: 2}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: bandolierId}),
    new CompendiumReference({id: sheathId}),
]);
// wizard kit
kits.set('09iZbcSifVqwVpWh', [
    ...treasure(11, 8),
    new CompendiumReference({id: staffId}),
    new CompendiumReference({id: adventurersPackId}),
    new CompendiumReference({id: materialPouchId}),
    new CompendiumReference({id: writingSetId}),
]);


/**
 * @param {string} itemId
 * @return {boolean}
 */
export function isKit(itemId) {
    return kits.has(itemId);
}

/**
 * @callback createItemCallback
 * @param {string} itemId
 * @param {?string} containerId
 * @param {?number} quantity
 */

/**
 * @param {CompendiumReference} item
 * @param {createItemCallback} createItem
 * @param {?string} containerId
 * @return {Promise<void>}
 */
async function createKitItem(item, createItem, containerId) {
    const itemId = item.id;
    if (kits.has(itemId)) {
        const subKits = kits.get(itemId);
        for (const subKit of subKits) {
            // eslint-disable-next-line no-await-in-loop
            await createKitItem(subKit, createItem, undefined);
        }
    } else {
        const createItemId = await createItem(itemId, containerId, item.quantity);
        for (const heldItem of item.holdsItems ?? []) {
            // eslint-disable-next-line no-await-in-loop
            await createKitItem(heldItem, createItem, createItemId);
        }
    }
}

/**
 * @param {string} itemId
 * @param {createItemCallback} createItem
 * @return {Promise<void>}
 */
export async function addKit(itemId, createItem) {
    const compendiumReferences = kits.get(itemId);
    for (const item of compendiumReferences) {
        // eslint-disable-next-line no-await-in-loop
        await createKitItem(item, createItem, undefined);
    }
}