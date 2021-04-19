import { ItemPF2e } from './base';
import { ActionData } from './data-definitions';

export class ActionCollection {
    action: { label: string; actions: ActionData[] };
    reaction: { label: string; actions: ActionData[] };
    free: { label: string; actions: ActionData[] };
    passive: { label: string; actions: ActionData[] };
    activity: { label: string; actions: ActionData[] };

    constructor() {
        this.action = { label: game.i18n.localize('PF2E.ActionCollections.Action'), actions: [] };
        this.reaction = { label: game.i18n.localize('PF2E.ActionCollections.Reaction'), actions: [] };
        this.free = { label: game.i18n.localize('PF2E.ActionCollections.Free'), actions: [] };
        this.passive = { label: game.i18n.localize('PF2E.ActionCollections.Passive'), actions: [] };
        this.activity = { label: game.i18n.localize('PF2E.ActionCollections.Activity'), actions: [] };
    }

    public addActionToCollection(action: ActionData): void {
        const actionType = action.data.actionType.value ?? 'action';
        this[actionType].actions.push(action);
    }
}

export class ActionPF2e extends ItemPF2e {
    /** @override */
    prepareData(): void {
        super.prepareData();

        const hasExplorationTrait = this.hasTrait('exploration');
        const hasDowntimeTrait = this.hasTrait('downtime');

        const availableInEncounterMode = this.data.data.actionType.value === 'action';
        const availableInExplorationMode = hasExplorationTrait;
        const availableInDowntimeMode = hasDowntimeTrait;

        if (this.data.data.modeOfPlay) {
            this.data.data.modeOfPlay.value.encounter ??= availableInEncounterMode;
            this.data.data.modeOfPlay.value.exploration ??= availableInExplorationMode;
            this.data.data.modeOfPlay.value.downtime ??= availableInDowntimeMode;
        } else {
            this.data.data.modeOfPlay = {
                value: {
                    encounter: availableInEncounterMode,
                    exploration: availableInExplorationMode,
                    downtime: availableInDowntimeMode,
                },
            };
        }
    }

    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = this.data.data;

        let associatedWeapon: ItemPF2e | null = null;
        if (data.weapon.value && this.actor) associatedWeapon = this.actor.getOwnedItem(data.weapon.value);

        // Feat properties
        const properties = [
            CONFIG.PF2E.actionTypes[data.actionType.value],
            associatedWeapon ? associatedWeapon.name : null,
        ].filter((p) => p);
        const traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }
}

export interface ActionPF2e {
    data: ActionData;
    _data: ActionData;
}
