import { PhysicalItemTrait } from "@item/physical/data";
import { SortDirection } from "../data";

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
    checkboxes: Record<"ancestry" | "classes" | "feattype" | "skills" | "rarity" | "source" | "traits", CheckboxData>;
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

export {
    ActionFilters,
    BaseFilterData,
    BestiaryFilters,
    CheckboxData,
    CheckboxOptions,
    EquipmentFilters,
    FeatFilters,
    HazardFilters,
    MultiselectData,
    RangesData,
    SpellFilters,
};
