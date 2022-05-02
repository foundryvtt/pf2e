import { ABCFeatureEntryData } from "@item/abc/data";
import { ABCSheetData } from "@item/sheet/data-types";
import { SheetOptions } from "@module/sheet/helpers";
import { ClassPF2e } from ".";

interface ClassSheetData extends ABCSheetData<ClassPF2e> {
    rarities: SheetOptions;
    items: { key: string; item: ABCFeatureEntryData }[];
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

export { ClassSheetData };
