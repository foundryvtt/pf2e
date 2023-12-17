import { AttributeString } from "@actor/types.ts";
import { SelfEffectReference, SelfEffectReferenceSource } from "@item/ability/index.ts";
import {
    ActionType,
    BaseItemSourcePF2e,
    Frequency,
    FrequencySource,
    ItemSystemSource,
    ItemTraits,
} from "@item/base/data/system.ts";
import { OneToThree } from "@module/data.ts";
import { FeatOrFeatureCategory, FeatTrait } from "./types.ts";

type FeatSource = BaseItemSourcePF2e<"feat", FeatSystemSource>;

interface PrerequisiteTagData {
    value: string;
}

interface FeatSystemSource extends ItemSystemSource {
    level: FeatLevelSource;
    traits: FeatTraits;
    /** The category of feat or feature of this item */
    category: FeatOrFeatureCategory;
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
    subfeatures?: Partial<FeatSubfeatures>;
    /** A self-applied effect for simple actions */
    selfEffect?: SelfEffectReferenceSource | null;
}

interface FeatLevelSource {
    value: number;
    taken?: number | null;
}

interface FeatSystemData extends Omit<FeatSystemSource, "maxTaken"> {
    level: FeatLevelData;

    /** `null` is set to `Infinity` during data preparation */
    maxTakable: number;
    frequency?: Frequency;
    subfeatures: FeatSubfeatures;
    /** A self-applied effect for simple actions */
    selfEffect: SelfEffectReference | null;
}

interface FeatLevelData extends Required<FeatLevelSource> {}

interface FeatSubfeatures {
    keyOptions: AttributeString[];
}

type FeatTraits = ItemTraits<FeatTrait>;

export type { FeatSource, FeatSystemData, FeatSystemSource, FeatTraits, PrerequisiteTagData };
