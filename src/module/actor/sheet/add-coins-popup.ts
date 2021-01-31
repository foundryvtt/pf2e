/* global game */

import { PF2EPhysicalItem } from 'src/module/item/physical';
import { addCoins, Coins } from '../../item/treasure';
import { PF2EActor } from '../actor';

interface AddCoinsFormData extends FormData, Coins {
    combineStacks: boolean;
}

/**
 * @category Other
 */
export class AddCoinsPopup extends FormApplication<PF2EActor> {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'add-coins';
        options.classes = [];
        options.title = 'Add Coins';
        options.template = 'systems/pf2e/templates/actors/add-coins.html';
        options.width = 'auto';
        return options;
    }

    async _updateObject(event: Event, formData: AddCoinsFormData) {
        const actor = this.object;
        addCoins({
            coins: {
                pp: formData.pp,
                gp: formData.gp,
                sp: formData.sp,
                cp: formData.cp,
            },
            updateItemQuantity: async (item, quantity) => {
                const currentQuantity = item?.data?.quantity?.value || 0;
                const ownedItem = actor.getOwnedItem(item._id);
                await ownedItem.update({ 'data.quantity.value': currentQuantity + quantity });
            },
            addFromCompendium: async (compendiumId, quantity) => {
                const pack = game.packs.find((p) => p.collection === 'pf2e.equipment-srd');
                const item = (await pack.getEntity(compendiumId)) as PF2EPhysicalItem;
                item.data.data.quantity.value = quantity;
                await actor.createOwnedItem(item.data);
            },
            combineStacks: formData.combineStacks,
            items: actor.data.items || [],
        });
    }
}
