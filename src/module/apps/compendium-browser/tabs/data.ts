import { FeatTrait } from "@item/feat/data";
import { PhysicalItemTrait } from "@item/physical/data";
import { CommonSortByOption, SortByOption, SortDirection } from "../data";
import type { SearchResult } from "minisearch";

type CheckboxOptions = Record<string, { label: string; selected: boolean }>;
interface CheckboxData {
    isExpanded: boolean;
    label: string;
    options: CheckboxOptions;
    selected: string[];
}

interface MultiselectData<T extends string = string> {
    label: string;
    options: { label: string; value: T }[];
    selected: { label: string; value: T }[];
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
    options: Record<string, string>;
}

interface RangesData {
    changed: boolean;
    isExpanded: boolean;
    values: {
        min: number;
        max: number;
        inputMin: string;
        inputMax: string;
    };
    label: string;
}

interface SliderData {
    isExpanded: boolean;
    values: {
        lowerLimit: number;
        upperLimit: number;
        min: number;
        max: number;
        step: number;
    };
    label: string;
}

interface BaseFilterData {
    checkboxes?: Record<string, CheckboxData>;
    selects?: Record<string, SelectData>;
    multiselects?: Record<string, MultiselectData>;
    order: OrderData;
    ranges?: Record<string, RangesData>;
    search: {
        text: string;
    };
    sliders?: Record<string, SliderData>;
}

interface ActionFilters extends BaseFilterData {
    checkboxes: Record<"traits" | "source", CheckboxData>;
}

interface BestiaryFilters extends BaseFilterData {
    checkboxes: Record<"alignments" | "rarity" | "sizes" | "source" | "traits", CheckboxData>;
    sliders: Record<"level", SliderData>;
}

interface EquipmentFilters extends BaseFilterData {
    checkboxes: Record<"armorTypes" | "weaponTypes" | "itemtypes" | "rarity" | "source", CheckboxData>;
    multiselects: Record<"traits", MultiselectData<PhysicalItemTrait>>;
    ranges: Record<"price", RangesData>;
    sliders: Record<"level", SliderData>;
}

interface FeatFilters extends BaseFilterData {
    checkboxes: Record<"feattype" | "skills" | "rarity" | "source", CheckboxData>;
    multiselects: Record<"traits", MultiselectData<FeatTrait>>;
    sliders: Record<"level", SliderData>;
}

interface HazardFilters extends BaseFilterData {
    checkboxes: Record<"complexity" | "rarity" | "source" | "traits", CheckboxData>;
    sliders: Record<"level", SliderData>;
}

interface SpellFilters extends BaseFilterData {
    checkboxes: Record<
        "category" | "classes" | "level" | "rarity" | "school" | "source" | "traditions" | "traits",
        CheckboxData
    >;
    selects: Record<"timefilter", SelectData>;
}

type CompendiumBrowserIndexData = Omit<CompendiumIndexData, "_id"> & Partial<SearchResult>;

interface RenderResultListOptions {
    list?: HTMLUListElement;
    start?: number;
    replace?: boolean;
}

// Models used for initializing filters
interface BaseInitialFilters {
    searchText?: string;
    orderBy?: SortByOption;
    orderDirection?: SortDirection;
}

interface InitialActionFilters extends BaseInitialFilters {
    traits?: string[];
    source?: string[];
    orderBy?: CommonSortByOption;
}

interface InitialBestiaryFilters extends BaseInitialFilters {
    alignments?: string[];
    rarity?: string[];
    sizes?: string[];
    source?: string[];
    traits?: string[];
    orderBy?: CommonSortByOption;
}

interface InitialEquipmentFilters extends BaseInitialFilters {
    armorTypes?: string[];
    weaponTypes?: string[];
    itemtypes?: string[];
    rarity?: string[];
    source?: string[];
    priceRange?: { min?: number | string; max?: number | string };
    levelRange?: { min?: number; max?: number };
    orderBy?: CommonSortByOption | "price";
}

interface InitialFeatFilters extends BaseInitialFilters {
    ancestry?: string[];
    classes?: string[];
    feattype?: string[];
    skills?: string[];
    rarity?: string[];
    source?: string[];
    traits?: string[];
    level?: { min?: number; max?: number };
    orderBy?: CommonSortByOption;
}

interface InitialHazardFilters extends BaseInitialFilters {
    complexity?: string[];
    rarity?: string[];
    source?: string[];
    traits?: string[];
    levelRange?: { min?: number; max?: number };
    orderBy?: CommonSortByOption;
}

interface InitialSpellFilters extends BaseInitialFilters {
    timefilter?: string;
    category?: string[];
    classes?: string[];
    level?: number[];
    rarity?: string[];
    school?: string[];
    source?: string[];
    traditions?: string[];
    traits?: string[];
    orderBy?: CommonSortByOption;
}

type InitialFilters =
    | InitialActionFilters
    | InitialBestiaryFilters
    | InitialEquipmentFilters
    | InitialFeatFilters
    | InitialHazardFilters
    | InitialSpellFilters;

export {
    ActionFilters,
    BaseFilterData,
    BestiaryFilters,
    CheckboxData,
    CheckboxOptions,
    CompendiumBrowserIndexData,
    EquipmentFilters,
    FeatFilters,
    HazardFilters,
    MultiselectData,
    RangesData,
    RenderResultListOptions,
    SpellFilters,
    InitialFilters,
    InitialActionFilters,
    InitialBestiaryFilters,
    InitialEquipmentFilters,
    InitialFeatFilters,
    InitialHazardFilters,
    InitialSpellFilters,
};
