import { ClassPF2e } from "@item/class";
import { createSheetOptions, createSheetTags } from "@module/sheet/helpers";
import { ABCSheetPF2e } from "../abc/sheet";
import { ClassSheetData } from "./types";

export class ClassSheetPF2e extends ABCSheetPF2e<ClassPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ClassSheetData> {
        const data = await super.getData(options);
        const itemData = data.item;

        const items = Object.entries(data.data.items)
            .map(([key, item]) => ({ key, item }))
            .sort((first, second) => first.item.level - second.item.level);

        return {
            ...data,
            items,
            rarities: createSheetOptions(CONFIG.PF2E.rarityTraits, { value: [itemData.system.traits.rarity] }),
            skills: CONFIG.PF2E.skills,
            proficiencyChoices: CONFIG.PF2E.proficiencyLevels,
            selectedKeyAbility: this.getLocalizedAbilities(itemData.system.keyAbility),
            ancestryTraits: createSheetTags(CONFIG.PF2E.ancestryItemTraits, itemData.system.traits),
            trainedSkills: createSheetTags(CONFIG.PF2E.skills, itemData.system.trainedSkills),
            ancestryFeatLevels: createSheetTags(CONFIG.PF2E.levels, itemData.system.ancestryFeatLevels),
            classFeatLevels: createSheetTags(CONFIG.PF2E.levels, itemData.system.classFeatLevels),
            generalFeatLevels: createSheetTags(CONFIG.PF2E.levels, itemData.system.generalFeatLevels),
            skillFeatLevels: createSheetTags(CONFIG.PF2E.levels, itemData.system.skillFeatLevels),
            skillIncreaseLevels: createSheetTags(CONFIG.PF2E.levels, itemData.system.skillIncreaseLevels),
        };
    }
}
