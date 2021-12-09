import { ContainerPF2e, PhysicalItemPF2e } from "@item";
import { Bulk, BulkItem, calculateBulk, formatBulk, toBulkItem, weightToBulk } from "@item/physical/bulk";
import { Size } from "@module/data";

/**
 * Extend Collection to implement bulk calculations
 */
export class PhysicalItems extends Collection<Embedded<PhysicalItemPF2e>> {
    /**
     * Convert the collection to BulkItems.
     * @returns An Array of BulkItems
     */
    toBulkItems(): BulkItem[] {
        return this.map((item) => toBulkItem(item.data));
    }

    /**
     * Calculate the Bulk of items in the collection and set the relevant item properties.
     * @param size
     * @returns The collection as BulkItems
     */
    prepareItems(size: Size): BulkItem[] {
        const bulkConfig = {
            ignoreCoinBulk: game.settings.get("pf2e", "ignoreCoinBulk"),
        };
        const bulkItems: BulkItem[] = [];
        for (const item of this) {
            const bulkItem: BulkItem = toBulkItem(item.data);
            let nestedExtraDimensionalContainer: boolean | undefined = false;
            if (item instanceof ContainerPF2e) {
                const extraDimensional = item.data.data.traits.value.includes('extradimensional');
                nestedExtraDimensionalContainer = extraDimensional && item.isInContainer && item.container?.data.data.traits.value.includes('extradimensional');
                const useNegateBulk = extraDimensional ? !nestedExtraDimensionalContainer : item.data.data.negateBulk && item.data.data.equipped;
                for (const containedItem of item.contents) {
                    const containedBulkItem = toBulkItem(containedItem.data);
                    bulkItem.holdsItems.push(containedBulkItem);
                }
                [item.data.data.containedItemBulk] = calculateBulk({
                    items: bulkItem.holdsItems,
                    bulkConfig: bulkConfig,
                    actorSize: size,
                });
                const capacity = weightToBulk(item.data.data.bulkCapacity.value);
                if (capacity) {
                    item.data.data.capacity.value = capacity.toLightBulk();
                }
            }
            const [approximatedBulk] = calculateBulk({
                items: bulkItem === undefined ? [] : [bulkItem],
                nestedExtraDimensionalContainer: nestedExtraDimensionalContainer,
                bulkConfig: bulkConfig,
                actorSize: size,
            });
            if(nestedExtraDimensionalContainer){
                console.log("nested");
                console.log(bulkItem);
                console.log(item);
                console.log(approximatedBulk);
            }
            item.data.totalWeight = formatBulk(approximatedBulk);
            if (!item.isInContainer) {
                bulkItems.push(bulkItem);
            }
        }
        return bulkItems;
    }
}
