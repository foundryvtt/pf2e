import { LocalizePF2e } from '@module/system/localize';
import { ConsumableData, ConsumableType } from './data-definitions';
import { PhysicalItemPF2e } from './physical';

export class ConsumablePF2e extends PhysicalItemPF2e {
    get consumableType(): ConsumableType {
        return this.data.data.consumableType.value;
    }

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
    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E.identification;
        const itemType = ['drug', 'elixir', 'mutagen', 'oil', 'other', 'potion'].includes(this.consumableType)
            ? translations.UnidentifiedType.Substance
            : game.i18n.localize(CONFIG.PF2E.consumableTypes[this.consumableType]);

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

export interface ConsumablePF2e {
    data: ConsumableData;
    _data: ConsumableData;
}
