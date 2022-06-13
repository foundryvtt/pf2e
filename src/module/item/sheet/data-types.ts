import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { ABCItemPF2e } from "@item/abc";
import { AncestryPF2e } from "@item/ancestry";
import { BackgroundPF2e } from "@item/background";
import { FeatPF2e } from "@item/feat";
import { HeritagePF2e } from "@item/heritage";
import { ItemActivation } from "@item/physical/data";
import { SpellPF2e } from "@item/spell";
import { SpellSystemData } from "@item/spell/data";
import { SheetOptions } from "@module/sheet/helpers";

export interface ItemSheetDataPF2e<TItem extends ItemPF2e> extends ItemSheetData<TItem> {
    itemType: string | null;
    hasSidebar: boolean;
    hasDetails: boolean;
    sidebarTemplate?: () => string;
    detailsTemplate?: () => string;
    item: TItem["data"];
    data: TItem["data"]["data"];
    isPhysical: boolean;
    user: { isGM: boolean };
    enabledRulesUI: boolean;
    ruleEditing: boolean;
    ruleSelection: {
        selected: string | null;
        types: Record<string, string>;
    };
}

export interface PhysicalItemSheetData<TItem extends PhysicalItemPF2e> extends ItemSheetDataPF2e<TItem> {
    isPhysical: true;
    basePriceString: string;
    priceString: string;
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    activations: { action: ItemActivation; id: string; base: string }[];
}

export interface ABCSheetData<TItem extends ABCItemPF2e> extends ItemSheetDataPF2e<TItem> {
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

export interface FeatSheetData extends ItemSheetDataPF2e<FeatPF2e> {
    featTypes: ConfigPF2e["PF2E"]["featTypes"];
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"] & ConfigPF2e["PF2E"]["healingTypes"];
    categories: ConfigPF2e["PF2E"]["actionCategories"];
    prerequisites: string;
    rarities: SheetOptions;
    traits: SheetOptions;
    isFeat: boolean;
    mandatoryTakeOnce: boolean;
    hasLineageTrait: boolean;
}

export interface SpellSheetOverlayData {
    id: string | null;
    /** Base path to the property, dot delimited */
    base: string;
    /** Base path to the spell override data, dot delimited. Currently this is the same as base */
    dataPath: string;
    level: number;
    data: Partial<SpellSystemData>;
    type: "heighten";
    heightenLevels: number[];
    missing: { key: keyof SpellSystemData; label: string }[];
}

export interface SpellSheetData extends ItemSheetDataPF2e<SpellPF2e> {
    isCantrip: boolean;
    isFocusSpell: boolean;
    isRitual: boolean;
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
    heightenIntervals: number[];
    heightenOverlays: SpellSheetOverlayData[];
    canHeighten: boolean;
}

export interface HeritageSheetData extends ItemSheetDataPF2e<HeritagePF2e> {
    ancestry: AncestryPF2e | null;
    ancestryRefBroken: boolean;
    traits: SheetOptions;
    rarities: SheetOptions;
}
