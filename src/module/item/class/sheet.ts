import { ClassPF2e } from "@item/class";
import { createSheetOptions } from "@module/sheet/helpers";
import { ABCSheetPF2e } from "../abc/sheet";
import { ClassSheetData } from "../sheet/data-types";

export class ClassSheetPF2e extends ABCSheetPF2e<ClassPF2e> {
    override async getData(): Promise<ClassSheetData> {
        const data = await super.getData();
        const itemData = data.item;

        const items = Object.entries(data.data.items)
            .map(([key, item]) => ({ key, item }))
            .sort((first, second) => first.item.level - second.item.level);

        return {
            ...data,
            items,
            rarities: createSheetOptions(CONFIG.PF2E.rarityTraits, { value: [itemData.data.traits.rarity] }),
            skills: CONFIG.PF2E.skills,
            proficiencyChoices: CONFIG.PF2E.proficiencyLevels,
            selectedKeyAbility: this.getLocalizedAbilities(itemData.data.keyAbility),
            ancestryTraits: createSheetOptions(CONFIG.PF2E.ancestryItemTraits, itemData.data.traits),
            trainedSkills: createSheetOptions(CONFIG.PF2E.skills, itemData.data.trainedSkills),
            ancestryFeatLevels: createSheetOptions(CONFIG.PF2E.levels, itemData.data.ancestryFeatLevels),
            classFeatLevels: createSheetOptions(CONFIG.PF2E.levels, itemData.data.classFeatLevels),
            generalFeatLevels: createSheetOptions(CONFIG.PF2E.levels, itemData.data.generalFeatLevels),
            skillFeatLevels: createSheetOptions(CONFIG.PF2E.levels, itemData.data.skillFeatLevels),
            skillIncreaseLevels: createSheetOptions(CONFIG.PF2E.levels, itemData.data.skillIncreaseLevels),
            abilityBoostLevels: createSheetOptions(CONFIG.PF2E.levels, itemData.data.abilityBoostLevels),
        };
    }
}
