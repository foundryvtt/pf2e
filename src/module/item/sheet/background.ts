import { ABCSheetPF2e } from "../abc/sheet";
import { BackgroundPF2e } from "@item/background";
import { BackgroundSheetData } from "./data-types";

export class BackgroundSheetPF2e extends ABCSheetPF2e<BackgroundPF2e> {
    override getData(): BackgroundSheetData {
        const data = super.getData();
        const itemData = data.item;

        return {
            ...data,
            rarities: this.prepareOptions(CONFIG.PF2E.rarityTraits, { value: [itemData.data.traits.rarity.value] }),
            trainedSkills: this.prepareOptions(CONFIG.PF2E.skills, itemData.data.trainedSkills),
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.data.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)])
            ),
        };
    }
}
