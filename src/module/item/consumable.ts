import { ConsumableData } from './data-definitions';
import { PhysicalItemPF2e } from './physical';

export class ConsumablePF2e extends PhysicalItemPF2e {
    get charges() {
        return {
            current: this.data.data.charges.value,
            max: this.data.data.charges.max,
        };
    }

    getChatData(this: Owned<ConsumablePF2e>, htmlOptions: EnrichHTMLOptions = {}) {
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
            hasCharges: this.charges.max > 0,
        });
    }

    /** @override */
    generateUnidentifiedName(): string {
        return game.i18n.format(`PF2E.identification.${status}`, {
            item: game.i18n.localize(CONFIG.PF2E.consumableTypes[this.data.data.consumableType.value]),
        });
    }
}

export interface ConsumablePF2e {
    data: ConsumableData;
    _data: ConsumableData;
}
