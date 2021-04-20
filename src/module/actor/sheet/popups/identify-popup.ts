import { identifyItem, IdentifyAlchemyDCs, IdentifyMagicDCs } from '@item/identification';
import { PhysicalItemPF2e } from '@item/physical';
import { ActorPF2e } from '@actor/base';
import { ErrorPF2e } from '@module/utils';

interface IdentifyPopupOptions extends FormApplicationOptions {
    itemId: string;
}

/**
 * @category Other
 */
export class IdentifyItemPopup extends FormApplication<ActorPF2e, IdentifyPopupOptions> {
    static get defaultOptions(): FormApplicationOptions {
        return {
            ...super.defaultOptions,
            id: 'identify-item',
            title: game.i18n.localize('PF2E.identification.Identify'),
            template: 'systems/pf2e/templates/actors/identify-item.html',
            width: 'auto',
            classes: ['identify-popup'],
        };
    }

    /** @override */
    activateListeners(html: JQuery): void {
        super.activateListeners(html);

        html.find('.identify').on('click', () => {
            this.getItem().setIdentifiedState('identified');
        });

        html.find('.misidentify').on('click', () => {
            this.getItem().setIdentifiedState('misidentified');
        });
    }

    protected async _updateObject(_event: any, _formData: FormData): Promise<void> {}

    getData() {
        const item = this.getItem();

        const notMatchingTraditionModifier = game.settings.get('pf2e', 'identifyMagicNotMatchingTraditionModifier');
        const proficiencyWithoutLevel = game.settings.get('pf2e', 'proficiencyVariant') === 'ProficiencyWithoutLevel';
        const dcs = identifyItem(item.data, {
            proficiencyWithoutLevel,
            notMatchingTraditionModifier,
        });
        return {
            ...super.getData(),
            isMagic: dcs instanceof IdentifyMagicDCs,
            isAlchemical: dcs instanceof IdentifyAlchemyDCs,
            dcs,
        };
    }

    getItem(): PhysicalItemPF2e {
        const { itemId } = this.options;
        const item = this.object.getOwnedItem(itemId);
        if (!item) {
            throw ErrorPF2e(`Could not load item with id: ${itemId} for identification`);
        } else if (!(item instanceof PhysicalItemPF2e)) {
            throw ErrorPF2e(`${item.name} is not a physical item.`);
        }

        return item;
    }
}
