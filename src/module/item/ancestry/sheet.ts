import { AncestryPF2e } from "@item/ancestry";
import { ABCSheetPF2e } from "@item/abc/sheet";
import { ABCSheetData, AncestrySheetData } from "../sheet/data-types";
import { createSheetOptions } from "@module/sheet/helpers";

export class AncestrySheetPF2e extends ABCSheetPF2e<AncestryPF2e> {
    override async getData(): Promise<AncestrySheetData> {
        const data: ABCSheetData<AncestryPF2e> = await super.getData();
        const itemData = data.item;

        return {
            ...data,
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.data.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)])
            ),
            selectedFlaws: Object.fromEntries(
                Object.entries(itemData.data.flaws).map(([k, b]) => [k, this.getLocalizedAbilities(b)])
            ),
            rarities: createSheetOptions(CONFIG.PF2E.rarityTraits, { value: [itemData.data.traits.rarity] }),
            sizes: createSheetOptions(CONFIG.PF2E.actorSizes, { value: [itemData.data.size] }),
            traits: createSheetOptions(CONFIG.PF2E.creatureTraits, itemData.data.traits),
            languages: createSheetOptions(CONFIG.PF2E.languages, itemData.data.languages),
            additionalLanguages: createSheetOptions(CONFIG.PF2E.languages, itemData.data.additionalLanguages),
        };
    }
}
