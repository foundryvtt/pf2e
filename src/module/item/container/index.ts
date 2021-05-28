import { PhysicalItemPF2e } from '@item/physical';
import { ContainerData } from './data';

export class ContainerPF2e extends PhysicalItemPF2e {
    /** @override */
    static get schema(): typeof ContainerData {
        return ContainerData;
    }

    /** @override */
    getChatData(this: Embedded<ContainerPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const traits = this.traitChatData(CONFIG.PF2E.equipmentTraits);

        return this.processChatData(htmlOptions, { ...data, traits });
    }
}

export interface ContainerPF2e {
    readonly data: ContainerData;
}
