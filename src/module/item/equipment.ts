import { LocalizePF2e } from '@module/system/localize';
import { objectHasKey } from '@module/utils';
import { EquipmentData } from './data/types';
import { PhysicalItemPF2e } from './physical';

export class EquipmentPF2e extends PhysicalItemPF2e {
    /** @override */
    getChatData(this: Owned<EquipmentPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const traits = this.traitChatData(CONFIG.PF2E.equipmentTraits);
        const properties = [data.equipped.value ? game.i18n.localize('PF2E.EquipmentEquippedLabel') : null].filter(
            (p) => p,
        );
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }

    /** @override */
    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E.identification;
        const slotType = /book\b/.test(this.slug ?? '')
            ? 'Book'
            : /\bring\b/.test(this.slug ?? '')
            ? 'Ring'
            : this.data.data.usage.value?.replace(/^worn/, '').capitalize() ?? '';

        const itemType = objectHasKey(translations.UnidentifiedType, slotType)
            ? translations.UnidentifiedType[slotType]
            : translations.UnidentifiedType.Object;

        if (typeOnly) return itemType;

        const formatString = translations.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

export interface EquipmentPF2e {
    data: EquipmentData;
}
