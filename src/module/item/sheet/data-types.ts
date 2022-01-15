import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { ABCFeatureEntryData } from "@item/abc/data";
import { AncestryPF2e } from "@item/ancestry";
import { BackgroundPF2e } from "@item/background";
import { ClassPF2e } from "@item/class";
import { FeatPF2e } from "@item/feat";
import { HeritagePF2e } from "@item/heritage";
import { ItemActivation } from "@item/physical/data";
import { SpellPF2e } from "@item/spell";

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

export interface ItemSheetDataPF2e<TItem extends ItemPF2e> extends ItemSheetData<TItem> {
    itemType: string | null;
    hasSidebar: boolean;
    hasDetails: boolean;
    sidebarTemplate?: () => string;
    detailsTemplate?: () => string;
    item: TItem["data"];
    data: TItem["data"]["data"];
    user: { isGM: boolean };
    enabledRulesUI: boolean;
}

export interface PhysicalItemSheetData<TItem extends PhysicalItemPF2e> extends ItemSheetDataPF2e<TItem> {
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    activations: { action: ItemActivation; id: string; base: string }[];
}

export interface ABCSheetData<TItem extends AncestryPF2e | BackgroundPF2e | ClassPF2e>
    extends ItemSheetDataPF2e<TItem> {
    hasDetails: true;
}

export interface AncestrySheetData extends ABCSheetData<AncestryPF2e> {
    selectedBoosts: Record<string, Record<string, string>>;
    selectedFlaws: Record<string, Record<string, string>>;
    rarities: SheetOptions;
    sizes: SheetOptions;
    traits: SheetOptions;
    languages: SheetOptions;
    additionalLanguages: SheetOptions;
}

export interface BackgroundSheetData extends ABCSheetData<BackgroundPF2e> {
    rarities: SheetOptions;
    trainedSkills: SheetOptions;
    selectedBoosts: Record<string, Record<string, string>>;
}

export interface ClassSheetData extends ABCSheetData<ClassPF2e> {
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

export interface FeatSheetData extends ItemSheetDataPF2e<FeatPF2e> {
    featTypes: ConfigPF2e["PF2E"]["featTypes"];
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"] & ConfigPF2e["PF2E"]["healingTypes"];
    categories: ConfigPF2e["PF2E"]["actionCategories"];
    prerequisites: string;
    rarities: SheetOptions;
    traits: SheetOptions;
}

export interface SpellSheetData extends ItemSheetDataPF2e<SpellPF2e> {
    magicSchools: ConfigPF2e["PF2E"]["magicSchools"];
    spellCategories: ConfigPF2e["PF2E"]["spellCategories"];
    spellLevels: ConfigPF2e["PF2E"]["spellLevels"];
    spellTypes: ConfigPF2e["PF2E"]["spellTypes"];
    magicTraditions: SheetOptions;
    damageCategories: ConfigPF2e["PF2E"]["damageCategories"];
    damageSubtypes: ConfigPF2e["PF2E"]["damageSubtypes"];
    spellComponents: string[];
    traits: SheetOptions;
    rarities: SheetOptions;
    areaSizes: ConfigPF2e["PF2E"]["areaSizes"];
    areaTypes: ConfigPF2e["PF2E"]["areaTypes"];
    spellScalingIntervals: number[];
}

export interface HeritageSheetData extends ItemSheetDataPF2e<HeritagePF2e> {
    ancestry: AncestryPF2e | null;
    ancestryRefBroken: boolean;
    traits: SheetOptions;
    rarities: SheetOptions;
}
