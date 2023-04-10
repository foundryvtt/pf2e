import { ActorPF2e } from "@actor";
import { InventoryBulk } from "@actor/inventory/index.ts";
import { ItemSummaryData } from "@item/data/index.ts";
import { EquipmentTrait } from "@item/equipment/data.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import { Bulk, weightToBulk } from "@item/physical/bulk.ts";
import { ContainerSource, ContainerSystemData } from "./data.ts";
import { hasExtraDimensionalParent } from "./helpers.ts";

class ContainerPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    /** This container's contents, reloaded every data preparation cycle */
    contents: Collection<PhysicalItemPF2e<NonNullable<TParent>>> = new Collection();

    /** Is this an actual stowing container or merely one of the old pouches/quivers/etc.? */
    get stowsItems(): boolean {
        return this.system.stowing;
    }

    get isCollapsed(): boolean {
        return this.system.collapsed;
    }

    get capacity(): { value: Bulk; max: Bulk } {
        return {
            value: InventoryBulk.computeTotalBulk(this.contents.contents, this.actor?.size ?? "med"),
            max: weightToBulk(this.system.bulkCapacity.value) || new Bulk(),
        };
    }

    get capacityPercentage(): number {
        const { value, max } = this.capacity;
        return Math.min(100, Math.floor((value.toLightBulk() / max.toLightBulk()) * 100));
    }

    override get bulk(): Bulk {
        const canReduceBulk = !this.traits.has("extradimensional") || !hasExtraDimensionalParent(this);
        const reduction = canReduceBulk ? weightToBulk(this.system.negateBulk.value) : new Bulk();
        return super.bulk.plus(this.capacity.value.minus(reduction ?? new Bulk()));
    }

    /** Reload this container's contents following Actor embedded-document preparation */
    override prepareSiblingData(this: ContainerPF2e<ActorPF2e>): void {
        this.contents = new Collection(
            this.actor.inventory.filter((i) => i.container?.id === this.id).map((item) => [item.id, item])
        );
    }

    /** Move the contents of this container into the next-higher container or otherwise the main actor inventory */
    async ejectContents(): Promise<void> {
        if (!this.actor) return;

        const updates = this.contents.map((i) => ({ _id: i.id, "system.containerId": this.container?.id ?? null }));
        await this.actor.updateEmbeddedDocuments("Item", updates, { render: false });
    }

    override async getChatData(
        this: ContainerPF2e<TParent>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits: this.traitChatData(CONFIG.PF2E.equipmentTraits),
        });
    }
}

interface ContainerPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ContainerSource;
    system: ContainerSystemData;

    get traits(): Set<EquipmentTrait>;
}

export { ContainerPF2e };
