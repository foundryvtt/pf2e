import { FeatPF2e } from '@item/feat';
import { FeatSheetData, ItemSheetDataPF2e } from '../sheet/data-types';
import { ItemSheetPF2e } from '../sheet/base';

export class FeatSheetPF2e extends ItemSheetPF2e<FeatPF2e> {
    override getData(): FeatSheetData {
        const data: ItemSheetDataPF2e<FeatPF2e> = super.getData();
        return {
            ...data,
            featTypes: CONFIG.PF2E.featTypes,
            featActionTypes: CONFIG.PF2E.featActionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            categories: CONFIG.PF2E.actionCategories,
            damageTypes: { ...CONFIG.PF2E.damageTypes, ...CONFIG.PF2E.healingTypes },
            prerequisites: JSON.stringify(this.item.data.data.prerequisites?.value ?? []),
            rarities: this.prepareOptions(CONFIG.PF2E.rarityTraits, { value: [data.data.traits.rarity.value] }),
            traits: this.prepareOptions(CONFIG.PF2E.featTraits, data.data.traits),
        };
    }
}
