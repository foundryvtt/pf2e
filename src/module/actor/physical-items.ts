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
     * Recursive function to handle nesting bulk items.
     */
    handleNesting(item: PhysicalItemPF2e, bulkItemCollection: Collection<BulkItem>): BulkItem {
        const existingItem = bulkItemCollection.get(item.id);
        if (existingItem) {
            return existingItem;
        }
        if (item instanceof ContainerPF2e) {
            const heldItems: BulkItem[] = [];
            for (const containedItem of item.contents) {
                heldItems.push(this.handleNesting(containedItem, bulkItemCollection));
            }
            const bulkItem = toBulkItem(item.data, heldItems);
            bulkItemCollection.set(item.id, bulkItem);
            return bulkItem;
        } else {
            const bulkItem = toBulkItem(item.data);
            bulkItemCollection.set(item.id, bulkItem);
            return bulkItem;
        }
    }

    /**
     * Turn the collection into a collection of properly nested bulk items.
     */
    toBulkItemCollection(): Collection<BulkItem> {
        const bulkItems: Collection<BulkItem> = new Collection();
        for (const item of this) {
            this.handleNesting(item, bulkItems);
        }
        return bulkItems;
    }

    /**
     * Calculate the Bulk of items in the collection and set the relevant item properties.
     * @param size
     * @returns The collection as a list of BulkItems
     */
    prepareItems(size: Size): BulkItem[] {
        const bulkConfig = {
            ignoreCoinBulk: game.settings.get("pf2e", "ignoreCoinBulk"),
        };
        const bulkItems: BulkItem[] = [];
        const bulkItemCollection = this.toBulkItemCollection();
        for (const item of this) {
            const bulkItem: BulkItem = bulkItemCollection.get(item.id) ?? toBulkItem(item.data);
            if (item instanceof ContainerPF2e) {
                const inExtraDimensionalContainer = item.inExtraDimensionalContainer;
                const [approximatedBulk] = calculateBulk({
                    items: bulkItem,
                    bulkConfig: bulkConfig,
                    nestedExtraDimensionalContainer: inExtraDimensionalContainer,
                    actorSize: size,
                });
                item.data.formattedBulk = formatBulk(approximatedBulk);
                item.data.data.containedItemBulk = bulkItem.heldItemBulk;
                const capacity = weightToBulk(item.data.data.bulkCapacity.value);
                if (capacity) {
                    item.data.data.capacity.value =
                        item.extraDimensional && inExtraDimensionalContainer ? 0 : capacity.toLightBulk();
                }
            } else {
                const [approximatedBulk] = calculateBulk({
                    items: bulkItem,
                    bulkConfig: bulkConfig,
                    actorSize: size,
                });
                item.data.formattedBulk = formatBulk(approximatedBulk);
            }
            if (!item.isInContainer) {
                bulkItems.push(bulkItem);
            }
        }
        return bulkItems;
    }
}
