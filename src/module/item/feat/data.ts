import { ActionType, BaseItemSourcePF2e, Frequency, FrequencySource, ItemSystemSource } from "@item/data/base";
import { OneToThree, TraitsWithRarity } from "@module/data";
import { FeatCategory, FeatTrait } from "./types";

type FeatSource = BaseItemSourcePF2e<"feat", FeatSystemSource>;

interface PrerequisiteTagData {
    value: string;
}

interface FeatSystemSource extends ItemSystemSource {
    level: { value: number };
    traits: FeatTraits;
    /** The category of feat or feature of this item */
    category: FeatCategory;
    /** Whether this feat must be taken at character level 1 */
    onlyLevel1: boolean;
    /** The maximum number of times this feat can be taken by a character. A value of `null` indicates no limit */
    maxTakable: number | null;
    actionType: {
        value: ActionType;
    };
    actions: {
        value: OneToThree | null;
    };
    prerequisites: {
        value: PrerequisiteTagData[];
    };
    location: string | null;
    frequency?: FrequencySource;
}

interface FeatSystemData extends Omit<FeatSystemSource, "maxTaken"> {
    /** `null` is set to `Infinity` during data preparation */
    maxTakable: number;
    frequency?: Frequency;
}

type FeatTraits = TraitsWithRarity<FeatTrait>;

export { FeatSource, FeatSystemData, FeatSystemSource, FeatTraits, PrerequisiteTagData };
