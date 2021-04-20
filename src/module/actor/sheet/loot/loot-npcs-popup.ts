import { PhysicalItemData } from '@item/data-definitions';
import { PhysicalItemPF2e } from '@item/physical';
import { ActorPF2e } from '../../base';

interface PopupData extends FormApplicationData<ActorPF2e> {
    tokenInfo?: {
        id: string;
        name: string;
        checked: boolean;
    }[];
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
            const token = canvas.tokens.placeables.find((token) => token.id === this.form[i]?.id);
            const currentSource = token instanceof Token ? ActorPF2e.fromToken(token) : undefined;
            if (selectionData[i] && currentSource) {
                const currentSourceItemData: PhysicalItemData[] = Array.from(
                    currentSource.items.values(),
                ).flatMap((item) => (item instanceof PhysicalItemPF2e ? item._data : []));
                itemData.push(...duplicate(currentSourceItemData));
                const idsToDelete = currentSourceItemData.map((item) => item._id);
                currentSource.deleteEmbeddedEntity('OwnedItem', idsToDelete);
            }
        }
        if (itemData.length > 0) {
            this.object.createEmbeddedEntity('OwnedItem', itemData);
        }
    }

    getData() {
        const sheetData: PopupData = super.getData();
        sheetData.tokenInfo = [];
        const selectedTokens = canvas.tokens.controlled.filter((token) => token.actor?._id !== this.object._id);
        for (let i = 0; i < selectedTokens.length; i++) {
            sheetData.tokenInfo.push({
                id: selectedTokens[i].id,
                name: selectedTokens[i].name,
                checked: !selectedTokens[i].actor!.hasPlayerOwner,
            });
        }
        return sheetData;
    }
}
