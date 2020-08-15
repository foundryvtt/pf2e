import {KitData, KitDetailsData, KitEntryData, PhysicalItemData} from './dataDefinitions';

type PhysicalItemDataEntry = {
    data: PhysicalItemData;
}

/**
 * async callback that must return the created item ids
 */
type createItemsCallback = (itemData: PhysicalItemDataEntry[]) => Promise<string[]>;

/**
 * Inflate a KitData.
 * Returns an array of pairs of ItemData and an array of ItemData contained by the first element
 */
async function getKitItemData(kitData: KitDetailsData | KitEntryData): Promise<[PhysicalItemDataEntry, PhysicalItemDataEntry[]][]> {
    const kitItems = await Promise.all(Object.values(kitData.items).map(async (item) => {
        let getItem;
        if (item.pack) {
            const pack = game.packs.get(item.pack);
            getItem = async (id) => pack.getEntry(id);
        } else {
            getItem = async (id) => duplicate((await game.items.get(id))?.data);
        }

        const itemData = await getItem(item.id);
        if (!itemData) {
            console.warn(`PF2E Kit: ${item.pack ?? 'World Item'} ${item.id} (${item.name}) not found`);
            return [];  // Return empty array that will be removed by flat
        }

        if (itemData.type === 'kit') {
            return getKitItemData(itemData.data);
        }

        itemData.data.quantity.value = item.quantity;

        // Get items in this container and remove any items that might be contained inside
        const containedItems = await getKitItemData(item);
        const containedItemData = containedItems.map(([i]) => i)

        // A non-kit returns an array with a single item and contained-items so  .flat() can work below
        return [[itemData, containedItemData]];
    }));

    return <[PhysicalItemDataEntry, PhysicalItemDataEntry[]][]>kitItems.flat();
}

export async function addKit(
    kitData: KitData, 
    createItems: createItemsCallback
): Promise<void> {
    const rootItemData = await getKitItemData(kitData.data);
    const potentialContainers = await createItems(rootItemData.map(([itemData]) => itemData));
    const containedItemData = rootItemData.map((
        [itemData, items], i) => <[PhysicalItemDataEntry[], string]>[items, potentialContainers[i]]
    ).flatMap(
        ([items, containerId]) => items.map(itemData => { 
            itemData.data.containerId.value = containerId;
            return itemData;
        })
    )
    await createItems(containedItemData);
}