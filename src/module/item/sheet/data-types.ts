/** Item sheet form types */

import { AncestryData, BackgroundData, ClassData } from '@item/data-definitions';

export interface SheetOption {
    label: string;
    selected: boolean;
}

export type SheetOptions = Record<string, SheetOption>;

export interface SheetSelections {
    value: (string | number)[];
    custom?: string;
}

interface ActiveEffectSummary {
    id: string;
    iconPath: string | null;
    name: string;
    duration: string;
    enabled: boolean;
}

export interface AESheetData {
    showAEs: boolean;
    canEdit: boolean;
    effects: ActiveEffectSummary[];
}

export interface ABCSheetData<D extends AncestryData | BackgroundData | ClassData> extends ItemSheetData<D> {
    activeEffects: AESheetData;
    hasSidebar: boolean;
    sidebarTemplate: () => string;
    hasDetails: true;
    detailsTemplate: () => string;
}

export interface AncestrySheetData extends ABCSheetData<AncestryData> {
    selectedBoosts: Record<string, Record<string, string>>;
    selectedFlaws: Record<string, Record<string, string>>;
    rarities: SheetOptions;
    sizes: SheetOptions;
    traits: SheetOptions;
    languages: SheetOptions;
    additionalLanguages: SheetOptions;
}

export interface BackgroundSheetData extends ABCSheetData<BackgroundData> {
    rarities: SheetOptions;
    trainedSkills: SheetOptions;
    selectedBoosts: Record<string, Record<string, string>>;
}

export interface ClassSheetData extends ABCSheetData<ClassData> {
    rarities: SheetOptions;
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
    abilityBoostLevels: SheetOptions;
}
