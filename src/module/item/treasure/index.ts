import { PhysicalItemPF2e } from '@item/physical';
import { TreasureData } from './data';

export class TreasurePF2e extends PhysicalItemPF2e {
    /** @override */
    static get schema(): typeof TreasureData {
        return TreasureData;
    }

    /** @override */
    getChatData(this: Embedded<TreasurePF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const traits = this.traitChatData({});

        return this.processChatData(htmlOptions, { ...data, traits });
    }
}

export interface TreasurePF2e {
    readonly data: TreasureData;
}
