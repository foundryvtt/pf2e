import { ActorPF2e } from '@actor/base';
import { PhysicalItemData } from '@item/data/types';
import { ErrorPF2e } from '@module/utils';

interface PopupData extends FormApplicationData<ActorPF2e> {
    tokenInfo: Array<{
        id: string;
        name: string;
        checked: boolean;
    }>;
}

/**
 * @category Other
 */
export class LootNPCsPopup extends FormApplication<ActorPF2e> {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'loot-NPCs';
        options.classes = [];
        options.title = 'Loot NPCs';
        options.template = 'systems/pf2e/templates/actors/loot/loot-npcs-popup.html';
        options.width = 'auto';
        return options;
    }

    activateListeners(html: JQuery) {
        super.activateListeners(html);
    }

    async _updateObject(_event: Event, formData: FormData & { selection?: boolean }): Promise<void> {
        const itemData: PhysicalItemData[] = [];
        const selectionData = Array.isArray(formData.selection) ? formData.selection : [formData.selection];
        for (let i = 0; i < selectionData.length; i++) {
            const token = canvas.tokens.placeables.find((token) => token.actor && token.id === this.form[i]?.id);
            if (!token) {
                throw ErrorPF2e(`Token ${this.form[i]?.id} not found`);
            }
            const currentSource = ActorPF2e.fromToken(token);
            if (selectionData[i] && currentSource) {
                const currentSourceItemData = currentSource.physicalItems.map((item) => item._data);
                itemData.push(...currentSourceItemData);
                const idsToDelete = currentSourceItemData.map((item) => item._id);
                currentSource.deleteEmbeddedEntity('OwnedItem', idsToDelete);
            }
        }
        if (itemData.length > 0) {
            await this.object.createEmbeddedEntity('OwnedItem', itemData);
        }
    }

    getData(): PopupData {
        const selectedTokens = canvas.tokens.controlled.filter(
            (token) => token.actor && token.actor.id !== this.object.id,
        );
        const tokenInfo = selectedTokens.map((token) => ({
            id: token.id,
            name: token.name,
            checked: token.actor!.hasPlayerOwner,
        }));
        return { ...super.getData(), tokenInfo };
    }
}
