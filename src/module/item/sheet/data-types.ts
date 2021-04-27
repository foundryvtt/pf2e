/** Item sheet form types */

import {
    ABCFeatureEntryData,
    AncestryData,
    BackgroundData,
    ClassData,
    FeatData,
    SpellData,
} from '@item/data-definitions';
import { ConfigPF2e } from '@scripts/config';
import { ItemSheetDataPF2e } from './base';

export interface SheetOption {
    value: string;
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
    abilityBoostLevels: SheetOptions;
}

export interface FeatSheetData extends ItemSheetDataPF2e<FeatData> {
    featTypes: ConfigPF2e['PF2E']['featTypes'];
    featActionTypes: ConfigPF2e['PF2E']['featActionTypes'];
    actionsNumber: ConfigPF2e['PF2E']['actionsNumber'];
    damageTypes: ConfigPF2e['PF2E']['damageTypes'] & ConfigPF2e['PF2E']['healingTypes'];
    categories: ConfigPF2e['PF2E']['actionCategories'];
    prerequisites: string;
    rarities: SheetOptions;
    traits: SheetOptions;
}

export interface SpellSheetData extends ItemSheetDataPF2e<SpellData> {
    magicSchools: ConfigPF2e['magicSchools'];
    spellCategories: ConfigPF2e['spellCategories'];
    spellLevels: ConfigPF2e['spellLevels'];
    spellTypes: ConfigPF2e['spellTypes'];
    magicTraditions: SheetOptions;
    spellComponents: string[];
    traits: SheetOptions;
    rarities: SheetOptions;
    areaSizes: ConfigPF2e['areaSizes'];
    areaTypes: ConfigPF2e['areaTypes'];
    spellScalingModes: ConfigPF2e['spellScalingModes'];
    isRitual: boolean;
}
