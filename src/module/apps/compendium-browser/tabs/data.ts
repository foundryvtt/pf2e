import { CreatureTrait } from "@actor/creature/types.ts";
import { HazardTrait } from "@actor/hazard/types.ts";
import { ActionTrait } from "@item/action/index.ts";
import { FeatTrait } from "@item/feat/types.ts";
import { PhysicalItemTrait } from "@item/physical/data.ts";
import { SearchResult } from "minisearch";
import { SortDirection } from "../data.ts";

type CheckboxOptions = Record<string, { label: string; selected: boolean }>;
interface CheckboxData {
    isExpanded: boolean;
    label: string;
    options: CheckboxOptions;
    selected: string[];
}

interface MultiselectData<T extends string = string> {
    label: string;
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
    order: OrderData;
    search: {
        text: string;
    };
}

interface ActionFilters extends BaseFilterData {
    checkboxes: {
        types: CheckboxData;
        category: CheckboxData;
        source: CheckboxData;
    };
    multiselects: {
        traits: MultiselectData<ActionTrait>;
    };
}

interface BestiaryFilters extends BaseFilterData {
    checkboxes: {
        alignments: CheckboxData;
        rarity: CheckboxData;
        sizes: CheckboxData;
        source: CheckboxData;
    };
    multiselects: {
        traits: MultiselectData<CreatureTrait>;
    };
    sliders: {
        level: SliderData;
    };
}

interface EquipmentFilters extends BaseFilterData {
    checkboxes: {
        armorTypes: CheckboxData;
        itemtypes: CheckboxData;
        rarity: CheckboxData;
        source: CheckboxData;
        weaponTypes: CheckboxData;
    };
    multiselects: {
        traits: MultiselectData<PhysicalItemTrait>;
    };
    ranges: {
        price: RangesData;
    };
    sliders: {
        level: SliderData;
    };
}

interface FeatFilters extends BaseFilterData {
    checkboxes: Record<"category" | "skills" | "rarity" | "source", CheckboxData>;
    multiselects: {
        traits: MultiselectData<FeatTrait>;
    };
    sliders: {
        level: SliderData;
    };
}

interface HazardFilters extends BaseFilterData {
    checkboxes: {
        complexity: CheckboxData;
        rarity: CheckboxData;
        source: CheckboxData;
    };
    multiselects: {
        traits: MultiselectData<HazardTrait>;
    };
    sliders: {
        level: SliderData;
    };
}

interface SpellFilters extends BaseFilterData {
    checkboxes: {
        category: CheckboxData;
        level: CheckboxData;
        rarity: CheckboxData;
        school: CheckboxData;
        source: CheckboxData;
        traditions: CheckboxData;
    };
    multiselects: {
        traits: MultiselectData<string>;
    };
    selects: {
        timefilter: SelectData;
    };
}

type BrowserFilter = ActionFilters | BestiaryFilters | EquipmentFilters | FeatFilters | HazardFilters | SpellFilters;

type CompendiumBrowserIndexData = Omit<CompendiumIndexData, "_id"> & Partial<SearchResult>;

interface RenderResultListOptions {
    list?: HTMLUListElement;
    start?: number;
    replace?: boolean;
}

export {
    ActionFilters,
    BaseFilterData,
    BestiaryFilters,
    BrowserFilter,
    CheckboxData,
    CheckboxOptions,
    CompendiumBrowserIndexData,
    EquipmentFilters,
    FeatFilters,
    HazardFilters,
    MultiselectData,
    RangesData,
    RenderResultListOptions,
    SliderData,
    SpellFilters,
};
