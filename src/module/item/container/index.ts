import { InventoryBulk } from "@actor/inventory";
import { EquipmentTrait } from "@item/equipment/data";
import { PhysicalItemPF2e } from "@item/physical";
import { Bulk, weightToBulk } from "@item/physical/bulk";
import { ContainerData } from "./data";
import { hasExtraDimensionalParent } from "./helpers";

class ContainerPF2e extends PhysicalItemPF2e {
    /** This container's contents, reloaded every data preparation cycle */
    contents: Collection<Embedded<PhysicalItemPF2e>> = new Collection();

    /** Is this an actual stowing container or merely one of the old pouches/quivers/etc.? */
    get stowsItems(): boolean {
        return this.data.data.stowing;
    }

    get isCollapsed(): boolean {
        return this.data.data.collapsed;
    }

    get capacity(): { value: Bulk; max: Bulk } {
        return {
            value: InventoryBulk.computeTotalBulk(this.contents.contents, this.actor?.size ?? "med"),
            max: weightToBulk(this.data.data.bulkCapacity.value) || new Bulk(),
        };
    }

    get capacityPercentage(): number {
        const { value, max } = this.capacity;
        return Math.min(100, Math.floor((value.toLightBulk() / max.toLightBulk()) * 100));
    }

    override get bulk(): Bulk {
        const canReduceBulk = !this.traits.has("extradimensional") || !hasExtraDimensionalParent(this);
        const reduction = canReduceBulk ? weightToBulk(this.data.data.negateBulk.value) : new Bulk();
        return super.bulk.plus(this.capacity.value.minus(reduction ?? new Bulk()));
    }

    /** Reload this container's contents following Actor embedded-document preparation */
    override prepareSiblingData(this: Embedded<ContainerPF2e>): void {
        this.contents = new Collection(
            this.actor.inventory.filter((item) => item.container?.id === this.id).map((item) => [item.id, item])
        );
    }

    /** Move the contents of this container into the next-higher container or otherwise the main actor inventory */
    async ejectContents(): Promise<void> {
        if (!this.actor) return;

        const updates = this.contents.map((i) => ({ _id: i.id, "data.containerId": this.container?.id ?? null }));
        await this.actor.updateEmbeddedDocuments("Item", updates, { render: false });
    }

    override getChatData(this: Embedded<ContainerPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const traits = this.traitChatData(CONFIG.PF2E.equipmentTraits);

        return this.processChatData(htmlOptions, { ...data, traits });
    }
}

interface ContainerPF2e {
    readonly data: ContainerData;

    get traits(): Set<EquipmentTrait>;
}

export { ContainerPF2e };
