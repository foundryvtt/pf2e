import { EquipmentTrait } from "@item/equipment/data";
import { PhysicalItemPF2e } from "@item/physical";
import { Bulk } from "@item/physical/bulk";
import { ContainerData } from "./data";

export class ContainerPF2e extends PhysicalItemPF2e {
    /** This container's contents, reloaded every data preparation cycle */
    contents: Collection<Embedded<PhysicalItemPF2e>> = new Collection();

    static override get schema(): typeof ContainerData {
        return ContainerData;
    }

    /** Reload this container's contents following Actor embedded-document preparation */
    override prepareSiblingData(this: Embedded<ContainerPF2e>): void {
        this.contents = new Collection(
            this.actor.physicalItems.filter((item) => item.container?.id === this.id).map((item) => [item.id, item])
        );
    }

    override getChatData(this: Embedded<ContainerPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const traits = this.traitChatData(CONFIG.PF2E.equipmentTraits);

        return this.processChatData(htmlOptions, { ...data, traits });
    }

    /** Remove references to container when deleted */
    override async delete(context: DocumentModificationContext = {}) {
        if (this.contents.size > 0) {
            this.contents.forEach((item) => item.removeContainer());
        }
        if (this.actor) {
            await this.actor.deleteEmbeddedDocuments("Item", [this.id], context);
            return this;
        }
        return super.delete(context);
    }

    get isContainer(): boolean {
        return true;
    }

    get extraDimensional(): boolean {
        return this.data.data.traits.value.includes("extradimensional");
    }

    get inExtraDimensionalContainer(): boolean {
        if (this.container) {
            return this.container.extraDimensional || this.container.inExtraDimensionalContainer;
        } else {
            return false;
        }
    }

    get containedItemBulk(): Bulk {
        return this.data.data.containedItemBulk ?? new Bulk();
    }

    /** How full the container is */
    get fullPercentage(): number {
        const containedItems = this.containedItemBulk.toLightBulk();
        return Math.floor((containedItems / this.data.data.capacity.value) * 100) || 0;
    }

    get isOverLoaded(): boolean {
        return this.containedItemBulk.toLightBulk() > this.data.data.capacity.value;
    }
}

export interface ContainerPF2e {
    readonly data: ContainerData;

    get traits(): Set<EquipmentTrait>;
}
