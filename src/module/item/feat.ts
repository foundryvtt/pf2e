import { ItemPF2e } from './base';
import { FeatData, FeatType } from './data-definitions';

export class FeatPF2e extends ItemPF2e {
    get featType(): { value: FeatType; label: string } {
        return {
            value: this.data.data.featType.value,
            label: game.i18n.localize(CONFIG.PF2E.featTypes[this.data.data.featType.value]),
        };
    }

    /**
     * Prepare chat card data for items of the "Feat" type
     */
    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = this.data.data;
        const properties = [
            `Level ${data.level.value || 0}`,
            data.actionType.value ? CONFIG.PF2E.actionTypes[data.actionType.value] : null,
        ].filter((p) => p);
        const traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.featTraits);
        return this.processChatData({ ...data, properties, traits }, htmlOptions);
    }
}

export interface FeatPF2e {
    data: FeatData;
    _data: FeatData;
}
