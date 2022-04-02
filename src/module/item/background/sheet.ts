import { ABCSheetPF2e } from "../abc/sheet";
import { BackgroundPF2e } from "@item/background";
import { BackgroundSheetData } from "../sheet/data-types";
import { createSheetOptions } from "@module/sheet/helpers";

export class BackgroundSheetPF2e extends ABCSheetPF2e<BackgroundPF2e> {
    override async getData(): Promise<BackgroundSheetData> {
        const data = await super.getData();
        const itemData = data.item;

        return {
            ...data,
            rarities: createSheetOptions(CONFIG.PF2E.rarityTraits, { value: [itemData.data.traits.rarity] }),
            trainedSkills: createSheetOptions(CONFIG.PF2E.skills, itemData.data.trainedSkills),
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.data.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)])
            ),
        };
    }
}
