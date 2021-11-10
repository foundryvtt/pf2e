import { ContainerPF2e, PhysicalItemPF2e } from "@item";
import { BulkItem, calculateBulk, formatBulk, toBulkItem, weightToBulk } from "@item/physical/bulk";
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
    prepareItems(size: Size): Collection<BulkItem> {
        const bulkConfig = {
            ignoreCoinBulk: game.settings.get("pf2e", "ignoreCoinBulk"),
        };
        const bulkItems = new Collection<BulkItem>();
        for (const item of this) {
            const bulkItem: BulkItem = bulkItems.get(item.id) ?? toBulkItem(item.data);
            if (!bulkItems.has(item.id)) {
                bulkItems.set(item.id, bulkItem);
            }
            if (item instanceof ContainerPF2e) {
                for (const containedItem of item.contents) {
                    const containedBulkItem = bulkItems.get(containedItem.id) ?? toBulkItem(containedItem.data);
                    if (!bulkItems.has(containedItem.id)) {
                        bulkItems.set(containedItem.id, containedBulkItem);
                    }
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
                bulkConfig: bulkConfig,
                actorSize: size,
            });
            item.data.totalWeight = formatBulk(approximatedBulk);
        }
        return bulkItems;
    }
}
