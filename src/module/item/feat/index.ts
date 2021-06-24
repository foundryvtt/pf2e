import { ItemPF2e } from '../index';
import { FeatData, FeatType } from './data';

export class FeatPF2e extends ItemPF2e {
    static override get schema(): typeof FeatData {
        return FeatData;
    }

    get featType(): { value: FeatType; label: string } {
        return {
            value: this.data.data.featType.value,
            label: game.i18n.localize(CONFIG.PF2E.featTypes[this.data.data.featType.value]),
        };
    }

    override getChatData(this: Embedded<FeatPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const properties = [
            `Level ${data.level.value || 0}`,
            data.actionType.value ? CONFIG.PF2E.actionTypes[data.actionType.value] : null,
        ].filter((p) => p);
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }
}

export interface FeatPF2e {
    readonly data: FeatData;
}
