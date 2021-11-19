import { ContainerPF2e, PhysicalItemPF2e } from "@item";
import { BulkConfig, BulkItem, calculateBulk, formatBulk, toBulkItem, weightToBulk } from "@item/physical/bulk";
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
            if (item.isInContainer) continue;
            const bulkItem: BulkItem = bulkItems.get(item.id) ?? toBulkItem(item.data);
            if (!bulkItems.has(item.id)) {
                bulkItems.set(item.id, bulkItem);
            }
            if (item instanceof ContainerPF2e) {
                this.calculateContainerBulk(bulkItem, item, bulkConfig, size);
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

    calculateContainerBulk(bulkItem: BulkItem, item: ContainerPF2e, bulkConfig: BulkConfig, size: Size) {
        item.contents.map((containedItem) => bulkItem.holdsItems.push(toBulkItem(containedItem.data)));
        bulkItem.holdsItems = bulkItem.holdsItems.map((containerItem) => {
            const physItem = this.find((i) => i.id === item.id);
            if (physItem instanceof ContainerPF2e) {
                return this.calculateContainerBulk(containerItem, physItem, bulkConfig, size);
            }
            return containerItem;
        });
        [item.data.data.containedItemBulk] = calculateBulk({
            nestedExtraDimensionalContainer:
                item.container?.traits.has("extradimensional") && bulkItem.extraDimensionalContainer,
            items: bulkItem.holdsItems,
            bulkConfig: bulkConfig,
            actorSize: size,
        });
        const capacity = weightToBulk(item.data.data.bulkCapacity.value);
        if (capacity) {
            item.data.data.capacity.value = capacity.toLightBulk();
        }
        return bulkItem;
    }
}
