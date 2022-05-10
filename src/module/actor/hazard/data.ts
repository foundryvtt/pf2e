import { SaveData } from "@actor/creature/data";
import { SaveType } from "@actor/data";
import {
    ActorSystemData,
    ActorSystemSource,
    BaseActorAttributes,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseHitPointsData,
    BaseTraitsData,
} from "@actor/data/base";
import { ZeroToTwo } from "@module/data";
import { HazardPF2e } from ".";

/** The stored source data of a hazard actor */
type HazardSource = BaseActorSourcePF2e<"hazard", HazardSystemData>;

interface HazardData
    extends Omit<HazardSource, "data" | "effects" | "flags" | "items" | "token" | "type">,
        BaseActorDataPF2e<HazardPF2e, "hazard", HazardSystemData, HazardSource> {}

/** The raw information contained within the actor data object for hazards. */
interface HazardSystemSource extends ActorSystemSource {
    details: HazardDetailsSource;
    attributes: HazardAttributes;
    saves: HazardSaves;
    /** Traits, languages, and other information. */
    traits: BaseTraitsData;
}

interface HazardSystemData extends HazardSystemSource, Omit<ActorSystemData, "attributes"> {
    details: HazardDetailsData;
}

interface HazardAttributes extends BaseActorAttributes {
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
        value: number;
        details: string;
    };
}

interface HazardDetailsSource {
    isComplex: boolean;
    level: { value: number };
    disable: string;
    description: string;
    reset: string;
    routine: string;
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
