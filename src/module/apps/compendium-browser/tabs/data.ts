import { CreatureTrait } from "@actor/creature/types.ts";
import { HazardTrait } from "@actor/hazard/types.ts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import { AbilityTrait } from "@item/ability/index.ts";
import { ActionType } from "@item/base/data/index.ts";
import { KingmakerTrait } from "@item/campaign-feature/types.ts";
import { FeatTrait } from "@item/feat/types.ts";
import { PhysicalItemTrait } from "@item/physical/data.ts";
import type { SearchResult } from "minisearch";
import type { SortDirection } from "../data.ts";

type LabeledValue<T extends string = string> = { label: string; value: T };

interface CheckboxData {
    isExpanded: boolean;
    label: string;
    options: LabeledValue[];
    /** Defaults to the object key of this filter */
    optionPrefix?: string;
    selected: string[];
}

interface ChipsData<T extends string = string> {
    conjunction: "and" | "or";
    isExpanded: boolean;
    label: string;
    options: LabeledValue<T>[];
    /** Defaults to the object key of this filter */
    optionPrefix?: string;
    selected: { exclude?: boolean; value: string }[];
    showConjunction?: boolean;
}

interface TraitData<T extends string = string> {
    conjunction: "and" | "or";
    options: LabeledValue<T>[];
    selected: { label: string; not?: boolean; value: string }[];
}

interface SelectData {
    label: string;
    options: LabeledValue[];
    /** Defaults to the object key of this filter */
    optionPrefix?: string;
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
    /** Defaults to the object key of this filter */
    optionPrefix?: string;
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
    traits: TraitData;
}

interface ActionFilters extends BaseFilterData {
    chips: {
        types: ChipsData<ActionType>;
        category: ChipsData;
    };
    source: CheckboxData;
    traits: TraitData<AbilityTrait>;
}

interface BestiaryFilters extends BaseFilterData {
    chips: {
        rarity: ChipsData;
        sizes: ChipsData;
    };
    source: CheckboxData;
    level: LevelData;
    traits: TraitData<CreatureTrait>;
}

interface CampaignFeatureFilters extends BaseFilterData {
    chips: Record<"category" | "rarity", ChipsData>;
    level: LevelData;
    source: CheckboxData;
    traits: TraitData<KingmakerTrait>;
}

interface EquipmentFilters extends BaseFilterData {
    chips: {
        armorTypes: ChipsData;
        itemTypes: ChipsData;
        rarity: ChipsData;
        weaponTypes: ChipsData;
    };
    ranges: {
        price: RangesInputData;
    };
    level: LevelData;
    source: CheckboxData;
    traits: TraitData<PhysicalItemTrait>;
}

type AdditionalFeatTrait = "ancestry:universal";

interface FeatFilters extends BaseFilterData {
    chips: Record<"category" | "skills" | "rarity", ChipsData>;
    level: LevelData;
    source: CheckboxData;
    traits: TraitData<FeatTrait | AdditionalFeatTrait>;
}

interface HazardFilters extends BaseFilterData {
    chips: {
        complexity: ChipsData;
        rarity: ChipsData;
    };
    level: LevelData;
    source: CheckboxData;
    traits: TraitData<HazardTrait>;
}

interface SpellFilters extends BaseFilterData {
    chips: {
        category: ChipsData;
        rank: ChipsData;
        rarity: ChipsData;
        defense: ChipsData;
        traditions: ChipsData;
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
    ChipsData,
    CompendiumBrowserIndexData,
    EquipmentFilters,
    FeatFilters,
    HazardFilters,
    LabeledValue,
    LevelData,
    RangesInputData,
    RenderResultListOptions,
    SelectData,
    SpellFilters,
    TraitData,
};
