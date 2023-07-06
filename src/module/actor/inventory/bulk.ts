import { ActorPF2e } from "@actor";
import { PhysicalItemPF2e } from "@item";
import { Bulk } from "@item/physical/bulk.ts";
import { Size } from "@module/data.ts";
import { groupBy } from "@util";

export class InventoryBulk {
    /** The current bulk carried by the actor */
    value: Bulk;
    /** The number of Bulk units the actor is encumbered at */
    encumberedAt: number;
    /** The maximum bulk the actor can carry */
    max: number;

    constructor(actor: ActorPF2e) {
        this.value = InventoryBulk.computeTotalBulk(
            actor.inventory.filter((i) => !i.isInContainer),
            actor.size
        );

        const strengthModifier = actor.isOfType("character", "npc") ? actor.abilities.str.mod : Infinity;

        const [bonusBulkLimit, bonusEncumbranceBulk] = actor.isOfType("character")
            ? [actor.attributes.bonusLimitBulk, actor.attributes.bonusEncumbranceBulk]
            : [0, 0];

        this.max = Math.floor(strengthModifier + bonusBulkLimit + 10);
        this.encumberedAt = Math.floor(strengthModifier + bonusEncumbranceBulk + 5);
    }

    get encumberedPercentage(): number {
        const totalTimes10 = this.value.toLightBulk();
        const encumberedAtTimes10 = this.encumberedAt * 10 + 10;
        return Math.floor((totalTimes10 / encumberedAtTimes10) * 100);
    }

    get maxPercentage(): number {
        const totalTimes10 = this.value.toLightBulk();
        const limitTimes10 = this.max * 10 + 10;
        return Math.floor((totalTimes10 / limitTimes10) * 100);
    }

    get maxPercentageInteger(): number {
        if (this.maxPercentage > 100) {
            return 100;
        }
        return this.maxPercentage;
    }

    get isEncumbered(): boolean {
        return this.value.normal > this.encumberedAt;
    }

    get isOverMax(): boolean {
        return this.value.normal > this.max;
    }

    get bulk(): number {
        return this.value.normal;
    }

    static computeTotalBulk(items: PhysicalItemPF2e[], actorSize: Size): Bulk {
        items = this.#flattenNonStowing(items);

        // Figure out which items have stack groups and which don't
        const nonStackingItems = items.filter(
            (i) => i.isOfType("backpack") || (i.system.bulk.per === 1 && i.system.baseItem)
        );
        const nonStackingIds = new Set(nonStackingItems.map((i) => i.id));
        const stackingItems = items.filter((i) => !nonStackingIds.has(i.id));

        // Compute non-stacking bulks
        const baseBulk = nonStackingItems.map((i) => i.bulk).reduce((first, second) => first.plus(second), new Bulk());

        // Group by stack group, then combine into quantities, then compute bulk from combined quantities
        const stackingBehaviors = stackingItems.map((item) => ({
            per: item.system.bulk.per,
            item,
            group: item.system.baseItem,
            bulk: new Bulk({ light: item.system.bulk.value }).convertToSize(item.size, actorSize),
        }));
        const grouped = groupBy(stackingBehaviors, (d) => `${d.group}-${d.per}-${d.bulk.toLightBulk()}`);
        const bulks = [...grouped.values()].map((dataEntries) => {
            const { bulk, per } = dataEntries[0]; // guaranteed to have at least one with groupBy
            const quantity = dataEntries.map((entry) => entry.item.quantity).reduce((sum, value) => sum + value, 0);
            const bulkRelevantQuantity = Math.floor(quantity / per);
            return bulk.times(bulkRelevantQuantity);
        });

        // Combine non-stacking and stacking bulks together
        return baseBulk.plus(bulks.reduce((first, second) => first.plus(second), new Bulk()));
    }

    /** Non-stowing containers are not "real" and thus shouldn't split stack groups */
    static #flattenNonStowing(items: PhysicalItemPF2e[]): PhysicalItemPF2e[] {
        return items
            .map((item) => {
                if (item.isOfType("backpack") && !item.stowsItems) {
                    return this.#flattenNonStowing(item.contents.contents);
                }
                return item;
            })
            .flat();
    }
}
