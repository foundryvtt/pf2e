import { EquipmentTrait } from "@item/equipment/data";
import { PhysicalItemPF2e } from "@item/physical";
import { ContainerData } from "./data";

export class ContainerPF2e extends PhysicalItemPF2e {
    /** This container's contents, reloaded every data preparation cycle */
    contents: Collection<Embedded<PhysicalItemPF2e>> = new Collection();

    static override get schema(): typeof ContainerData {
        return ContainerData;
    }

    /** Reload this container's contents following Actor embedded-document preparation */
    prepareSiblingData(this: Embedded<ContainerPF2e>): void {
        this.contents = new Collection(
            this.actor.physicalItems.filter((item) => item.container?.id === this.id).map((item) => [item.id, item])
        );
    }

    override getChatData(this: Embedded<ContainerPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const traits = this.traitChatData(CONFIG.PF2E.equipmentTraits);

        return this.processChatData(htmlOptions, { ...data, traits });
    }
}

export interface ContainerPF2e {
    readonly data: ContainerData;

    get traits(): Set<EquipmentTrait>;
}
