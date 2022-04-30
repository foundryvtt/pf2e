import { SortDirection } from "../data";

export type CheckBoxOptions = Record<string, { label: string; selected: boolean }>;
export interface CheckBoxdata {
    isExpanded: boolean;
    label: string;
    options: CheckBoxOptions;
    selected: string[];
}

interface DropDownData {
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

export interface RangesData {
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

export interface BaseFilterData {
    checkboxes?: Record<string, CheckBoxdata>;
    dropdowns?: Record<string, DropDownData>;
    order: OrderData;
    ranges?: Record<string, RangesData>;
    search: {
        text: string;
    };
    sliders?: Record<string, SliderData>;
}

export interface ActionFilters extends BaseFilterData {
    checkboxes: Record<"traits" | "source", CheckBoxdata>;
}

export interface BestiaryFilters extends BaseFilterData {
    checkboxes: Record<"alignments" | "rarity" | "sizes" | "source" | "traits", CheckBoxdata>;
    sliders: Record<"level", SliderData>;
}

export interface EquipmentFilters extends BaseFilterData {
    checkboxes: Record<
        "armorTypes" | "consumableType" | "weaponTypes" | "weaponTraits" | "itemtypes" | "rarity" | "source",
        CheckBoxdata
    >;
    ranges: Record<"price", RangesData>;
    sliders: Record<"level", SliderData>;
}

export interface FeatFilters extends BaseFilterData {
    checkboxes: Record<"ancestry" | "classes" | "feattype" | "skills" | "rarity" | "source" | "traits", CheckBoxdata>;
    sliders: Record<"level", SliderData>;
}

export interface HazardFilters extends BaseFilterData {
    checkboxes: Record<"complexity" | "rarity" | "source" | "traits", CheckBoxdata>;
    sliders: Record<"level", SliderData>;
}

export interface SpellFilters extends BaseFilterData {
    checkboxes: Record<
        "category" | "classes" | "level" | "rarity" | "school" | "source" | "traditions" | "traits",
        CheckBoxdata
    >;
    dropdowns: Record<"timefilter", DropDownData>;
}
