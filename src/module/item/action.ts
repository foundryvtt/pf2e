import { ItemPF2e } from './base';
import { ActionData, FeatData } from './data-definitions';
import { FeatPF2e } from '@item/feat';

export class ActionCollection {
    action: { label: string; actions: (ActionData | FeatData)[] };
    reaction: { label: string; actions: (ActionData | FeatData)[] };
    free: { label: string; actions: (ActionData | FeatData)[] };
    passive: { label: string; actions: (ActionData | FeatData)[] };
    activity: { label: string; actions: (ActionData | FeatData)[] };

    constructor() {
        this.action = { label: game.i18n.localize('PF2E.ActionCollections.Action'), actions: [] };
        this.reaction = { label: game.i18n.localize('PF2E.ActionCollections.Reaction'), actions: [] };
        this.free = { label: game.i18n.localize('PF2E.ActionCollections.Free'), actions: [] };
        this.passive = { label: game.i18n.localize('PF2E.ActionCollections.Passive'), actions: [] };
        this.activity = { label: game.i18n.localize('PF2E.ActionCollections.Activity'), actions: [] };
    }

    public addActionToCollection(action: ActionData | FeatData): void {
        const actionType = action.data.actionType.value ?? 'action';
        this[actionType].actions.push(action);
    }
}

export class ActionPF2e extends ItemPF2e {
    /** @override */
    prepareData(): void {
        super.prepareData();

        ActionPF2e.addActionType(this);
    }

    public static addActionType(item: ActionPF2e | FeatPF2e) {
        const hasExplorationTrait = item.hasTrait('exploration');
        const hasDowntimeTrait = item.hasTrait('downtime');

        const availableInEncounterMode = ['action', 'reaction', 'free'].includes(item.data.data.actionType.value);
        const availableInExplorationMode = hasExplorationTrait;
        const availableInDowntimeMode = hasDowntimeTrait;

        if (item.data.data.modeOfPlay) {
            item.data.data.modeOfPlay.value.encounter ??= availableInEncounterMode;
            item.data.data.modeOfPlay.value.exploration ??= availableInExplorationMode;
            item.data.data.modeOfPlay.value.downtime ??= availableInDowntimeMode;
        } else {
            item.data.data.modeOfPlay = {
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
