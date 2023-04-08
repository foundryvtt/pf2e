import { ActorPF2e } from "@actor/base.ts";
import { PhysicalItemSource } from "@item/data/index.ts";
import { ErrorPF2e } from "@util";

interface PopupData extends FormApplicationData<ActorPF2e> {
    tokenInfo: {
        id: string;
        name: string;
        checked: boolean;
    }[];
}

export class LootNPCsPopup extends FormApplication<ActorPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "loot-NPCs";
        options.classes = [];
        options.title = "Loot NPCs";
        options.template = "systems/pf2e/templates/actors/loot/loot-npcs-popup.hbs";
        options.width = "auto";
        return options;
    }

    override async _updateObject(
        _event: Event,
        formData: Record<string, unknown> & { selection?: boolean }
    ): Promise<void> {
        const itemData: PhysicalItemSource[] = [];
        const selectionData = Array.isArray(formData.selection) ? formData.selection : [formData.selection];
        for (let i = 0; i < selectionData.length; i++) {
            const token = canvas.tokens.placeables.find((token) => token.actor && token.id === this.form[i]?.id);
            if (!token) {
                throw ErrorPF2e(`Token ${this.form[i]?.id} not found`);
            }
            const currentSource = token.actor;
            if (selectionData[i] && currentSource) {
                const currentSourceItemData = currentSource.inventory.map((item) => item.toObject());
                itemData.push(...currentSourceItemData);
                const idsToDelete = currentSourceItemData.map((item) => item._id);
                currentSource.deleteEmbeddedDocuments("Item", idsToDelete);
            }
        }
        if (itemData.length > 0) {
            await this.object.createEmbeddedDocuments("Item", itemData);
        }
    }

    override async getData(): Promise<PopupData> {
        const selectedTokens = canvas.tokens.controlled.filter(
            (token) => token.actor && token.actor.id !== this.object.id
        );
        const tokenInfo = selectedTokens.map((token) => ({
            id: token.id,
            name: token.name,
            checked: token.actor!.hasPlayerOwner,
        }));
        return { ...(await super.getData()), tokenInfo };
    }
}
