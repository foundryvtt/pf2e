import { PhysicalItemData } from '@item/dataDefinitions';
import { PF2EPhysicalItem } from '@item/physical';
import { PF2EActor } from '../../actor';

interface PopupData extends FormApplicationData<PF2EActor> {
    tokenInfo?: {
        id: string;
        name: string;
        checked: boolean;
    }[];
}

/**
 * @category Other
 */
export class LootNPCsPopup extends FormApplication<PF2EActor> {
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
            const currentSource = token instanceof Token ? PF2EActor.fromToken(token) : undefined;
            if (selectionData[i] && currentSource) {
                const currentSourceItemData: PhysicalItemData[] = Array.from(
                    currentSource.items.values(),
                ).flatMap((item) => (item instanceof PF2EPhysicalItem ? item.data : []));
                itemData.push(...duplicate(currentSourceItemData));
                const idsToDelete = currentSourceItemData.map((item) => item._id);
                currentSource.deleteEmbeddedEntity('OwnedItem', idsToDelete);
            }
        }
        if (itemData.length > 0) {
            this.object.createOwnedItem(itemData);
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
                checked: !selectedTokens[i].actor?.hasPlayerOwner,
            });
        }
        return sheetData;
    }
}
