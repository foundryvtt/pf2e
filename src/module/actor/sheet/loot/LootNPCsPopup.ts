/* global canvas */

import { isPhysicalItem } from '../../../item/dataDefinitions';
import { PF2EActor } from '../../actor';

/**
 * @category Other
 */
export class LootNPCsPopup extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'loot-NPCs';
        options.classes = [];
        options.title = 'Loot NPCs';
        options.template = 'systems/pf2e/templates/actors/loot/loot-npcs-popup.html';
        options.width = 'auto';
        return options;
    }

    activateListeners(html) {
        super.activateListeners(html);
    }

    async _updateObject(event: Event, formData: any) {
        const itemData = [];
        const selectionData = typeof formData.selection === 'boolean' ? [formData.selection] : formData.selection;
        for (let i = 0; i < selectionData.length; i++) {
            if (selectionData[i]) {
                const currentSource = Actor.fromToken(
                    canvas.tokens.placeables.find((token) => token.id === this.form[i].id),
                ) as PF2EActor;
                const currentSourceItemData = currentSource.data.items.filter((item) => isPhysicalItem(item));
                itemData.push(...duplicate(currentSourceItemData));
                const idsToDelete = currentSourceItemData.map((item) => {
                    return item._id;
                });
                currentSource.deleteEmbeddedEntity('OwnedItem', idsToDelete);
            }
        }
        if (itemData.length > 0) {
            this.object.createOwnedItem(itemData);
        }
    }

    getData() {
        const sheetData = super.getData();
        sheetData.tokenInfo = [];
        const selectedTokens = canvas.tokens.controlled;
        for (let i = 0; i < selectedTokens.length; i++) {
            sheetData.tokenInfo.push({
                id: selectedTokens[i].id,
                name: selectedTokens[i].name,
                checked: !selectedTokens[i].actor.hasPlayerOwner,
            });
        }
        return sheetData;
    }
}
