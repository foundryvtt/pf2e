import { ClassPF2e } from "@item/class";
import { createSheetOptions, createSheetTags } from "@module/sheet/helpers";
import { ABCSheetPF2e } from "../abc/sheet";
import { ClassSheetData } from "./types";

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
            ancestryTraits: createSheetTags(CONFIG.PF2E.ancestryItemTraits, itemData.data.traits),
            trainedSkills: createSheetTags(CONFIG.PF2E.skills, itemData.data.trainedSkills),
            ancestryFeatLevels: createSheetTags(CONFIG.PF2E.levels, itemData.data.ancestryFeatLevels),
            classFeatLevels: createSheetTags(CONFIG.PF2E.levels, itemData.data.classFeatLevels),
            generalFeatLevels: createSheetTags(CONFIG.PF2E.levels, itemData.data.generalFeatLevels),
            skillFeatLevels: createSheetTags(CONFIG.PF2E.levels, itemData.data.skillFeatLevels),
            skillIncreaseLevels: createSheetTags(CONFIG.PF2E.levels, itemData.data.skillIncreaseLevels),
        };
    }
}
