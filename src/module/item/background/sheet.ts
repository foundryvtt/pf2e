import { ABCSheetPF2e } from "../abc/sheet";
import { BackgroundPF2e } from "@item/background";
import { BackgroundSheetData } from "../sheet/data-types";
import { createSheetOptions } from "@module/sheet/helpers";

export class BackgroundSheetPF2e extends ABCSheetPF2e<BackgroundPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<BackgroundSheetData> {
        const data = await super.getData(options);
        const itemData = data.item;

        return {
            ...data,
            rarities: createSheetOptions(CONFIG.PF2E.rarityTraits, { value: [itemData.system.traits.rarity] }),
            trainedSkills: createSheetOptions(CONFIG.PF2E.skills, itemData.system.trainedSkills),
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.system.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)])
            ),
        };
    }
}
