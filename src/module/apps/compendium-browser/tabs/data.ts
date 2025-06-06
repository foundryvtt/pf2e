import { CreatureTrait } from "@actor/creature/types.ts";
import { HazardTrait } from "@actor/hazard/types.ts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import { AbilityTrait } from "@item/ability/index.ts";
import { KingmakerTrait } from "@item/campaign-feature/types.ts";
import { FeatTrait } from "@item/feat/types.ts";
import { PhysicalItemTrait } from "@item/physical/data.ts";
import type { SearchResult } from "minisearch";
import { SortDirection } from "../data.ts";

interface CheckboxOption {
    label: string;
    selected: boolean;
}

type CheckboxOptions = Record<string, CheckboxOption>;

interface CheckboxData {
    isExpanded: boolean;
    label: string;
    options: CheckboxOptions;
    selected: string[];
}

interface TraitData<T extends string = string> {
    conjunction: "and" | "or";
    options: { label: string; value: T }[];
    selected: { label: string; not?: boolean; value: T }[];
}

interface SelectData {
    label: string;
    options: Record<string, string>;
    selected: string;
}

interface OrderData {
    by: string;
    direction: SortDirection;
    /** The key must be present as an index key in the database */
    options: Record<string, { label: string; type: "alpha" | "numeric" }>;
    type: "alpha" | "numeric";
}

interface RangesInputData {
    changed: boolean;
    defaultMin: string;
    defaultMax: string;
    isExpanded: boolean;
    values: {
        min: number;
        max: number;
        inputMin: string;
        inputMax: string;
    };
    label: string;
}

interface LevelData {
    changed: boolean;
    isExpanded: boolean;
    min: number;
    max: number;
    from: number;
    to: number;
}

interface BaseFilterData {
    order: OrderData;
    search: {
        text: string;
    };
    traits: TraitData<string>;
}

interface ActionFilters extends BaseFilterData {
    checkboxes: {
        types: CheckboxData;
        category: CheckboxData;
    };
    source: CheckboxData;
    traits: TraitData<AbilityTrait>;
}

interface BestiaryFilters extends BaseFilterData {
    checkboxes: {
        rarity: CheckboxData;
        sizes: CheckboxData;
    };
    source: CheckboxData;
    level: LevelData;
    traits: TraitData<CreatureTrait>;
}

interface CampaignFeatureFilters extends BaseFilterData {
    checkboxes: Record<"category" | "rarity", CheckboxData>;
    level: LevelData;
    source: CheckboxData;
    traits: TraitData<KingmakerTrait>;
}

interface EquipmentFilters extends BaseFilterData {
    checkboxes: {
        armorTypes: CheckboxData;
        itemTypes: CheckboxData;
        rarity: CheckboxData;
        weaponTypes: CheckboxData;
    };
    ranges: {
        price: RangesInputData;
    };
    level: LevelData;
    source: CheckboxData;
    traits: TraitData<PhysicalItemTrait>;
}

interface FeatFilters extends BaseFilterData {
    checkboxes: Record<"category" | "skills" | "rarity", CheckboxData>;
    level: LevelData;
    source: CheckboxData;
    traits: TraitData<FeatTrait>;
}

interface HazardFilters extends BaseFilterData {
    checkboxes: {
        complexity: CheckboxData;
        rarity: CheckboxData;
    };
    level: LevelData;
    source: CheckboxData;
    traits: TraitData<HazardTrait>;
}

interface SpellFilters extends BaseFilterData {
    checkboxes: {
        category: CheckboxData;
        rank: CheckboxData;
        rarity: CheckboxData;
        traditions: CheckboxData;
    };
    selects: {
        timefilter: SelectData;
    };
    source: CheckboxData;
}

type BrowserFilter =
    | ActionFilters
    | BestiaryFilters
    | CampaignFeatureFilters
    | EquipmentFilters
    | FeatFilters
    | HazardFilters
    | SpellFilters;

type BrowserFilterData = CheckboxData | LevelData | SelectData | RangesInputData | TraitData;

type CompendiumBrowserIndexData = Omit<CompendiumIndexData, "_id"> & Partial<SearchResult>;

interface RenderResultListOptions {
    list?: HTMLUListElement;
    start?: number;
    replace?: boolean;
}

export type {
    ActionFilters,
    BaseFilterData,
    BestiaryFilters,
    BrowserFilter,
    BrowserFilterData,
    CampaignFeatureFilters,
    CheckboxData,
    CheckboxOption,
    CheckboxOptions,
    CompendiumBrowserIndexData,
    EquipmentFilters,
    FeatFilters,
    HazardFilters,
    LevelData,
    RangesInputData,
    RenderResultListOptions,
    SelectData,
    SpellFilters,
    TraitData,
};
