import { SaveData } from "@actor/creature/data";
import {
    ActorSystemData,
    ActorSystemSource,
    ActorAttributes,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseHitPointsData,
    ActorTraitsSource,
} from "@actor/data/base";
import { ActorSizePF2e } from "@actor/data/size";
import { SaveType } from "@actor/types";
import { Rarity, Size, ZeroToTwo } from "@module/data";
import { HazardPF2e } from ".";
import { HazardTrait } from "./types";

/** The stored source data of a hazard actor */
type HazardSource = BaseActorSourcePF2e<"hazard", HazardSystemData>;

interface HazardData
    extends Omit<HazardSource, "data" | "system" | "effects" | "flags" | "items" | "prototypeToken" | "type">,
        BaseActorDataPF2e<HazardPF2e, "hazard", HazardSystemData, HazardSource> {}

/** The raw information contained within the actor data object for hazards. */
interface HazardSystemSource extends ActorSystemSource {
    details: HazardDetailsSource;
    attributes: HazardAttributes;
    saves: HazardSaves;
    /** Traits, languages, and other information. */
    traits: HazardTraitsSource;
}

interface HazardSystemData extends HazardSystemSource, Omit<ActorSystemData, "attributes" | "traits"> {
    details: HazardDetailsData;
    traits: HazardTraitsData;
}

interface HazardTraitsSource extends ActorTraitsSource<HazardTrait> {
    size: { value: Size };
    rarity: Rarity;
}

interface HazardTraitsData extends HazardTraitsSource {
    size: ActorSizePF2e;
    rarity: Rarity;
}

interface HazardAttributes extends ActorAttributes {
    ac: {
        value: number;
    };
    hasHealth: boolean;
    hp: HazardHitPoints;
    hardness: number;
    initiative: {
        roll?: undefined;
        tiebreakPriority: ZeroToTwo;
    };
    stealth: {
        value: number | null;
        details: string;
    };
    /**
     * Whether the hazard emits sound and can therefore be detected via hearing. A value of "encounter" indicates it is
     * silent until an encounter begins.
     */
    emitsSound: boolean | "encounter";
}

interface HazardDetailsSource {
    isComplex: boolean;
    level: { value: number };
    disable?: string;
    description?: string;
    reset?: string;
    routine?: string;
}

interface HazardDetailsData extends HazardDetailsSource {
    alliance: null;
}

interface HazardHitPoints extends Required<BaseHitPointsData> {
    negativeHealing: boolean;
    brokenThreshold: number;
}

type HazardSaves = Record<SaveType, SaveData>;

export { HazardData, HazardSource, HazardSystemData };
