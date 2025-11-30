import type { ActorPF2e } from "@actor";
import { transferItemsBetweenActors } from "@actor/helpers.js";
import { ErrorPF2e } from "@util";
import appv1 = foundry.appv1;

class LootNPCsPopup extends appv1.api.FormApplication<ActorPF2e> {
    static override get defaultOptions(): appv1.api.FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "loot-NPCs";
        options.classes = [];
        options.title = "Loot NPCs";
        options.template = `${SYSTEM_ROOT}/templates/actors/loot/loot-npcs-popup.hbs`;
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
        const selectionData = Array.isArray(formData.selection) ? formData.selection : [formData.selection];

        for (let i = 0; i < selectionData.length; i++) {
            const token = canvas.tokens.placeables.find((token) => token.actor && token.id === this.form[i]?.id);
            if (!token) {
                throw ErrorPF2e(`Token ${this.form[i]?.id} not found`);
            }

            if (selectionData[i] && token.actor) {
                await transferItemsBetweenActors(token.actor, lootActor);
            }
        }
    }
}

interface PopupData extends appv1.api.FormApplicationData<ActorPF2e> {
    tokenInfo: {
        id: string;
        name: string;
        checked: boolean;
    }[];
}

export { LootNPCsPopup };
