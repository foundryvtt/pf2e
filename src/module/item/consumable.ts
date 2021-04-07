import { ConsumableData } from './data-definitions';
import { PhysicalItemPF2e } from './physical';

export class ConsumablePF2e extends PhysicalItemPF2e {
    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = this.data.data;
        const localize = game.i18n.localize.bind(game.i18n);
        const consumableType = CONFIG.PF2E.consumableTypes[data.consumableType.value];
        return this.processChatData(htmlOptions, {
            ...data,
            consumableType: {
                ...data.consumableType,
                str: consumableType,
            },
            properties: [
                consumableType,
                `${data.charges.value}/${data.charges.max} ${localize('PF2E.ConsumableChargesLabel')}`,
            ],
            hasCharges: data.charges.value >= 0,
        });
    }
}

export interface ConsumablePF2e {
    data: ConsumableData;
    _data: ConsumableData;
}
