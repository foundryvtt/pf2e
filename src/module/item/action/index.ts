import { ItemPF2e } from '@item/base';
import { ActionData } from './data';

export class ActionPF2e extends ItemPF2e {
    static override get schema(): typeof ActionData {
        return ActionData;
    }

    override prepareData() {
        const data = super.prepareData();

        /**
         * @todo Fill this out like so or whatever we settle on
         * data.data.playMode.encounter ??= false; // etc.
         **/

        return data;
    }

    override getChatData(this: Embedded<ActionPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const associatedWeapon = this.actor?.items.get(data.weapon.value) ?? null;

        // Feat properties
        const properties = [
            CONFIG.PF2E.actionTypes[data.actionType.value],
            associatedWeapon ? associatedWeapon.name : null,
        ].filter((p) => p);
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }
}

export interface ActionPF2e {
    readonly data: ActionData;
}
