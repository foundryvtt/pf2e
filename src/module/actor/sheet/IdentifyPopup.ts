/* global FormApplication */
import {identifyItem, IdentifyAlchemyDCs, IdentifyMagicDCs} from '../../item/identification';

/**
 * @category Other
 */
export class IdentifyItemPopup extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'identify-item';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.identification.Identify');
        options.template = 'systems/pf2e/templates/actors/identify-item.html';
        options.width = 'auto';
        options.classes = ['identify-popup'];
        return options;
    }

    async _updateObject(event: Event, formData: any) {
        const {itemId} = this.options;
        await this.object.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.identified.value': true });
    }

    getData() {
        const item = this.object.getOwnedItem(this.options.itemId);
        const notMatchingTraditionModifier = game.settings.get('pf2e', 'identifyMagicNotMatchingTraditionModifier');
        const proficiencyWithoutLevel = game.settings.get('pf2e', 'proficiencyVariant')
            === 'ProficiencyWithoutLevel';
        const dcs = identifyItem(item.data, {
            proficiencyWithoutLevel,
            notMatchingTraditionModifier,
        });
        return {
            isMagic: dcs instanceof IdentifyMagicDCs,
            isAlchemical: dcs instanceof IdentifyAlchemyDCs,
            dcs,
        }; 
    }
}