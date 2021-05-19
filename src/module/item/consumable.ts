import { LocalizePF2e } from '@module/system/localize';
import { ConsumableData, ConsumableType } from './data/types';
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
        const translations = LocalizePF2e.translations.PF2E;
        const traits = this.traitChatData(CONFIG.PF2E.consumableTraits);
        const [consumableType, isUsable] = this.isIdentified
            ? [game.i18n.localize(this.consumableType), true]
            : [
                  this.generateUnidentifiedName({ typeOnly: true }),
                  !['other', 'scroll', 'talisman', 'tool', 'wand'].includes(this.consumableType),
              ];

        return this.processChatData(htmlOptions, {
            ...data,
            traits,
            properties:
                this.isIdentified && this.charges.max > 0
                    ? [`${data.charges.value}/${data.charges.max} ${translations.ConsumableChargesLabel}`]
                    : [],
            usesCharges: this.charges.max > 0,
            hasCharges: this.charges.max > 0 && this.charges.current > 0,
            consumableType,
            isUsable,
        });
    }

    /** @override */
    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E.identification;
        const liquidOrSubstance = () =>
            this.traits.has('inhaled') || this.traits.has('contact')
                ? translations.UnidentifiedType.Substance
                : translations.UnidentifiedType.Liquid;
        const itemType = ['drug', 'elixir', 'mutagen', 'oil', 'poison', 'potion'].includes(this.consumableType)
            ? liquidOrSubstance()
            : ['scroll', 'snare', 'ammo'].includes(this.consumableType)
            ? game.i18n.localize(CONFIG.PF2E.consumableTypes[this.consumableType])
            : translations.UnidentifiedType.Object;

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

export interface ConsumablePF2e {
    data: ConsumableData;
}
