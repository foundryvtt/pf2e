import { ItemPF2e } from './base';
import { ActionData } from './data-definitions';

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
