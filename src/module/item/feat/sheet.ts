import { FeatPF2e } from "@item/feat";
import { FeatSheetData, ItemSheetDataPF2e } from "../sheet/data-types";
import { ItemSheetPF2e } from "../sheet/base";
import { tupleHasValue } from "@util";

export class FeatSheetPF2e extends ItemSheetPF2e<FeatPF2e> {
    override async getData(): Promise<FeatSheetData> {
        const data: ItemSheetDataPF2e<FeatPF2e> = await super.getData();

        // Features shouldn't show anything in the header, they're not actually feats
        const isFeature = tupleHasValue(["ancestryfeature", "classfeature"], this.item.featType.value);

        return {
            ...data,
            itemType: isFeature ? null : game.i18n.localize("ITEM.TypeFeat"),
            featTypes: CONFIG.PF2E.featTypes,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            categories: CONFIG.PF2E.actionCategories,
            damageTypes: { ...CONFIG.PF2E.damageTypes, ...CONFIG.PF2E.healingTypes },
            prerequisites: JSON.stringify(this.item.data.data.prerequisites?.value ?? []),
            rarities: this.prepareOptions(CONFIG.PF2E.rarityTraits, { value: [data.data.traits.rarity.value] }),
            traits: this.prepareOptions(CONFIG.PF2E.featTraits, data.data.traits),
        };
    }
}
