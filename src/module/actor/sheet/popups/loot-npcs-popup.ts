import type { ActorPF2e } from "@actor";
import type { PhysicalItemPF2e } from "@item";
import { ErrorPF2e } from "@util";

class LootNPCsPopup extends FormApplication<ActorPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "loot-NPCs";
        options.classes = [];
        options.title = "Loot NPCs";
        options.template = "systems/pf2e/templates/actors/loot/loot-npcs-popup.hbs";
        options.width = "auto";
        return options;
    }

    override async getData(): Promise<PopupData> {
        const selectedTokens = canvas.ready
            ? canvas.tokens.controlled.filter((t) => t.actor && t.actor.id !== this.object.id)
            : [];
        const tokenInfo = selectedTokens.map((t) => ({
            id: t.id,
            name: t.name,
            checked: t.actor?.hasPlayerOwner ?? false,
        }));
        return { ...(await super.getData()), tokenInfo };
    }

    override async _updateObject(
        _event: Event,
        formData: Record<string, unknown> & { selection?: boolean },
    ): Promise<void> {
        if (!canvas.ready) return;

        const lootActor = this.object;
        const newItems: PhysicalItemPF2e[] = [];
        const itemUpdates = new Map<string, number>();
        const itemsToDelete = new Map<ActorPF2e, string[]>();
        const selectionData = Array.isArray(formData.selection) ? formData.selection : [formData.selection];

        for (let i = 0; i < selectionData.length; i++) {
            const token = canvas.tokens.placeables.find((token) => token.actor && token.id === this.form[i]?.id);
            if (!token) {
                throw ErrorPF2e(`Token ${this.form[i]?.id} not found`);
            }
            const currentSource = token.actor;
            if (selectionData[i] && currentSource) {
                for (const item of currentSource.inventory) {
                    const stackableItem = lootActor.inventory.findStackableItem(item);
                    if (stackableItem) {
                        const currentQuantity = itemUpdates.get(stackableItem.id) ?? stackableItem.quantity;
                        itemUpdates.set(stackableItem.id, currentQuantity + item.quantity);
                        continue;
                    }
                    newItems.push(item);
                }
                // Deletions will be performed last in case of the other operations failing
                itemsToDelete.set(
                    currentSource,
                    currentSource.inventory.map((item) => item.id),
                );
            }
        }
        // Create new items in the loot actor
        if (newItems.length > 0) {
            // Try to stack incoming items
            const stacked = newItems.reduce((result: PhysicalItemPF2e[], item) => {
                const stackableItem = result.find((i) => i.isStackableWith(item));
                if (stackableItem) {
                    // Update existing item in the result list
                    stackableItem.updateSource({
                        system: {
                            quantity: stackableItem.quantity + item.quantity,
                        },
                    });
                    return result;
                }
                // Item is not stackable with an existing item in the result list; add it
                result.push(item);
                return result;
            }, []);
            const sources = stacked.map((i) => i.toObject());
            await lootActor.createEmbeddedDocuments("Item", sources, {
                render: itemUpdates.size === 0,
            });
        }
        // Update exisiting items in the loot actor with new quantity
        if (itemUpdates.size > 0) {
            const updates = [...itemUpdates.entries()].map(([id, quantity]) => ({
                _id: id,
                system: {
                    quantity,
                },
            }));
            await lootActor.updateEmbeddedDocuments("Item", updates);
        }
        // Delete items from source actors
        if (itemsToDelete.size > 0) {
            for (const [actor, ids] of itemsToDelete) {
                actor.deleteEmbeddedDocuments("Item", ids);
            }
        }
    }
}

interface PopupData extends FormApplicationData<ActorPF2e> {
    tokenInfo: {
        id: string;
        name: string;
        checked: boolean;
    }[];
}

export { LootNPCsPopup };
