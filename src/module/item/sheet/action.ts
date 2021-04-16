import { ActionPF2e } from '@item/action';
import { FeatData, WeaponData } from '@item/data-definitions';
import { ItemSheetDataPF2e, ItemSheetPF2e } from './base';

export class ActionSheetPF2e extends ItemSheetPF2e<ActionPF2e> {
    getData() {
        const data: ItemSheetDataPF2e<FeatData> = super.getData();
        const actorWeapons: WeaponData[] =
            this.actor?.data.items.filter((itemData): itemData is WeaponData => itemData.type === 'weapon') ?? [];
        const actionType = data.data.actionType.value || 'action';
        let actionImg: string | number = 0;
        if (actionType === 'action') actionImg = parseInt((data.data.actions || {}).value, 10) || 1;
        else if (actionType === 'reaction') actionImg = 'reaction';
        else if (actionType === 'free') actionImg = 'free';
        else if (actionType === 'passive') actionImg = 'passive';

        data.item.img = this.getActionImg(actionImg.toString());

        return {
            ...data,
            categories: CONFIG.PF2E.actionCategories,
            weapons: actorWeapons,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            featTraits: CONFIG.PF2E.featTraits,
            skills: CONFIG.PF2E.skillList,
            proficiencies: CONFIG.PF2E.proficiencyLevels,
            traits: this.prepareOptions(CONFIG.PF2E.featTraits, data.data.traits),
        };
    }
}
