import { ActionPF2e } from '@item/action';
import { WeaponData } from '@item/data-definitions';
import { ItemSheetPF2e } from './base';

export class ActionSheetPF2e extends ItemSheetPF2e<ActionPF2e> {
    getData() {
        const data = super.getData();
        const actorWeapons: WeaponData[] =
            this.actor?.data.items.filter((itemData): itemData is WeaponData => itemData.type === 'weapon') ?? [];
        const actionType = data.data.actionType.value || 'action';
        let actionImg: string | number = 0;
        if (actionType === 'action') actionImg = parseInt((data.data.actions || {}).value, 10) || 1;
        else if (actionType === 'reaction') actionImg = 'reaction';
        else if (actionType === 'free') actionImg = 'free';
        else if (actionType === 'passive') actionImg = 'passive';

        data.item.img = this.getActionImg(actionImg.toString());
        data.categories = CONFIG.PF2E.actionCategories;
        data.weapons = actorWeapons;
        data.actionTypes = CONFIG.PF2E.actionTypes;
        data.actionsNumber = CONFIG.PF2E.actionsNumber;
        data.featTraits = CONFIG.PF2E.featTraits;
        data.skills = CONFIG.PF2E.skillList;
        data.proficiencies = CONFIG.PF2E.proficiencyLevels;
        data.actionTags = [data.data.traits.value].filter((t) => !!t);

        this.prepareTraits(data.data.traits, CONFIG.PF2E.featTraits);
        return data;
    }
}
