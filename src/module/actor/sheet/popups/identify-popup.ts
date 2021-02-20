import { identifyItem, IdentifyAlchemyDCs, IdentifyMagicDCs } from '@item/identification';
import { PF2EPhysicalItem } from '@item/physical';
import { PF2EActor } from '../../actor';

/**
 * @category Other
 */
export class IdentifyItemPopup extends FormApplication<PF2EActor> {
    static get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = 'identify-item';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.identification.Identify');
        options.template = 'systems/pf2e/templates/actors/identify-item.html';
        options.width = 'auto';
        options.classes = ['identify-popup'];
        return options;
    }

    protected async _updateObject(_event: Event, _formData: FormData): Promise<void> {
        const item = this.getItem();

        item.setIsIdentified(true);
    }

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

    getItem(): any {
        const { itemId } = this.options;
        const item = this.object.getOwnedItem(itemId);
        if (!item) {
            throw Error(`PF2e | Could not load item with id: ${itemId} for identification`);
        } else if (!(item instanceof PF2EPhysicalItem)) {
            throw Error(`PF2e | ${item?.name} is not a physical item.`);
        }

        return item;
    }
}
