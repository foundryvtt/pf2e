import { ItemPF2e } from './base';
import { ActionData } from './data-definitions';

export class ActionPF2e extends ItemPF2e {
    /** @override */
    prepareData() {
        const data = super.prepareData();

        /**
         * @todo Fill this out like so or whatever we settle on
         * data.data.playMode.encounter ??= false; // etc.
         **/

        return data;
    }

    getChatData(this: Owned<ActionPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
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
