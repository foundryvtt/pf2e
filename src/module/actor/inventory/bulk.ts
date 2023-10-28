import { ActorPF2e } from "@actor";
import { PhysicalItemPF2e } from "@item";
import { Bulk } from "@item/physical/bulk.ts";
import { Size } from "@module/data.ts";
import { groupBy } from "@util";

export class InventoryBulk {
    actor: ActorPF2e;

    #value: Bulk | null = null;

    encumberedAfterAddend = 0;
    maxAddend = 0;

    constructor(actor: ActorPF2e) {
        this.actor = actor;
    }

    get #actorStrength(): number {
        return this.actor.isOfType("character", "npc") ? this.actor.abilities.str.mod : Infinity;
    }

    get encumberedAfter(): number {
        return Math.floor(this.#actorStrength + 5 + this.encumberedAfterAddend);
    }

    get encumberedAfterBreakdown(): string {
        const addend = this.encumberedAfterAddend;
        const stat = game.i18n.localize(CONFIG.PF2E.abilities.str);
        return `5 + ${this.#actorStrength} (${stat})` + (addend ? ` + ${addend}` : "");
    }

    get max(): number {
        return Math.floor(this.#actorStrength + 10 + this.maxAddend);
    }

    get maxBreakdown(): string {
        const addend = this.maxAddend;
        const stat = game.i18n.localize(CONFIG.PF2E.abilities.str);
        return `10 + ${this.#actorStrength} (${stat})` + (addend ? ` + ${addend}` : "");
    }

    get value(): Bulk {
        if (this.#value) return this.#value;
        this.#value = InventoryBulk.computeTotalBulk(
            this.actor.inventory.filter((i) => !i.isInContainer),
            this.actor.size,
        );
        return this.#value;
    }

    get encumberedPercentage(): number {
        const totalTimes10 = this.value.toLightBulk();
        const encumberedAtTimes10 = this.encumberedAfter * 10 + 10;
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
        return this.value.normal > this.encumberedAfter;
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
            (i) => i.isOfType("backpack") || (i.system.bulk.per === 1 && i.system.baseItem),
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
