/* global game */
import { PhysicalItemData, KitData, KitDetailsData, KitEntryData } from './dataDefinitions';

/**
 * Inflate a KitData.
 * Returns an array of pairs of ItemData and an array of ItemData contained by the first element
 */
async function getKitItemData(
    kitData: KitDetailsData | KitEntryData,
): Promise<[PhysicalItemData, PhysicalItemData[]][]> {
    const kitItems = await Promise.all(
        Object.values(kitData.items).map(async (item) => {
            let itemData: PhysicalItemData;
            if (item.pack) {
                const pack = game.packs.get(item.pack);
                itemData = await pack.getEntry(item.id);
            } else {
                itemData = duplicate(game.items.get(item.id)?.data) as PhysicalItemData;
            }

            if (!itemData) {
                console.warn(`PF2E Kit: ${item.pack ?? 'World Item'} ${item.id} (${item.name}) not found`);
                return []; // Return empty array that will be removed by flat
            }

            if (itemData.type === 'kit') {
                return getKitItemData(itemData.data);
            }

            itemData.data.quantity.value = item.quantity;

            // Get items in this container and remove any items that might be contained inside
            const containedItems = await getKitItemData(item);
            const containedItemData = containedItems.map(([i]) => i);

            // A non-kit returns an array with a single item and contained-items so  .flat() can work below
            return [[itemData, containedItemData]];
        }),
    );

    return <[PhysicalItemData, PhysicalItemData[]][]>kitItems.flat();
}

export async function addKit(
    kitData: KitData,
    createItems: (itemData: PhysicalItemData[]) => Promise<string[]>,
): Promise<void> {
    const rootItemData = await getKitItemData(kitData.data);
    const potentialContainers = await createItems(rootItemData.map(([itemData]) => itemData));
    const containedItemData = rootItemData
        .map(([_itemData, items], i) => <[PhysicalItemData[], string]>[items, potentialContainers[i]])
        .flatMap(([items, containerId]) =>
            items.map((itemData) => {
                itemData.data.containerId.value = containerId;
                return itemData;
            }),
        );
    await createItems(containedItemData);
}
