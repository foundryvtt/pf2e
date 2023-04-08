import { ClassPF2e } from "@item/class/document.ts";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers.ts";
import { ABCSheetData, ABCSheetPF2e } from "../abc/sheet.ts";

export class ClassSheetPF2e extends ABCSheetPF2e<ClassPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ClassSheetData> {
        const sheetData = await super.getData(options);
        const itemData = sheetData.item;

        return {
            ...sheetData,
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

interface ClassSheetData extends ABCSheetData<ClassPF2e> {
    skills: typeof CONFIG.PF2E.skills;
    proficiencyChoices: typeof CONFIG.PF2E.proficiencyLevels;
    selectedKeyAbility: Record<string, string>;
    ancestryTraits: SheetOptions;
    trainedSkills: SheetOptions;
    ancestryFeatLevels: SheetOptions;
    classFeatLevels: SheetOptions;
    generalFeatLevels: SheetOptions;
    skillFeatLevels: SheetOptions;
    skillIncreaseLevels: SheetOptions;
}
