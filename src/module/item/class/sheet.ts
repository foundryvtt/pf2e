import { ClassPF2e } from "@item/class";
import { ABCSheetPF2e } from "../abc/sheet";
import { ClassSheetData } from "../sheet/data-types";

export class ClassSheetPF2e extends ABCSheetPF2e<ClassPF2e> {
    override getData(): ClassSheetData {
        const data = super.getData();
        const itemData = data.item;

        const items = Object.entries(data.data.items)
            .map(([key, item]) => ({ key, item }))
            .sort((first, second) => first.item.level - second.item.level);

        return {
            ...data,
            items,
            rarities: this.prepareOptions(CONFIG.PF2E.rarityTraits, { value: [itemData.data.traits.rarity.value] }),
            skills: CONFIG.PF2E.skills,
            proficiencyChoices: CONFIG.PF2E.proficiencyLevels,
            selectedKeyAbility: this.getLocalizedAbilities(itemData.data.keyAbility),
            ancestryTraits: this.prepareOptions(CONFIG.PF2E.ancestryItemTraits, itemData.data.traits),
            trainedSkills: this.prepareOptions(CONFIG.PF2E.skills, itemData.data.trainedSkills),
            ancestryFeatLevels: this.prepareOptions(CONFIG.PF2E.levels, itemData.data.ancestryFeatLevels),
            classFeatLevels: this.prepareOptions(CONFIG.PF2E.levels, itemData.data.classFeatLevels),
            generalFeatLevels: this.prepareOptions(CONFIG.PF2E.levels, itemData.data.generalFeatLevels),
            skillFeatLevels: this.prepareOptions(CONFIG.PF2E.levels, itemData.data.skillFeatLevels),
            skillIncreaseLevels: this.prepareOptions(CONFIG.PF2E.levels, itemData.data.skillIncreaseLevels),
            abilityBoostLevels: this.prepareOptions(CONFIG.PF2E.levels, itemData.data.abilityBoostLevels),
        };
    }
}
