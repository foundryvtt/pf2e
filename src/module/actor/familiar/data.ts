import {
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureDetailsSource,
    CreatureSystemData,
    CreatureSystemSource,
} from "@actor/creature/data.ts";
import { AttributeString } from "@actor/types.ts";
import { StatisticTraceData } from "@system/statistic/index.ts";

type FamiliarSource = BaseCreatureSource<"familiar", FamiliarSystemSource>;

interface FamiliarSystemSource extends CreatureSystemSource {
    details: FamiliarDetailsSource;
    attributes: FamiliarAttributesSource;
    master: {
        id: string | null;
        ability: AttributeString | null;
    };

    customModifiers?: never;
    perception?: never;
    resources?: never;
    saves?: never;
    skills?: never;
    traits?: never;
}

interface FamiliarAttributesSource {
    hp: { value: number; temp: number };
    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface FamiliarDetailsSource extends CreatureDetailsSource {
    creature: {
        value: string;
    };
    alliance?: never;
    languages?: never;
    level?: never;
}

/** The raw information contained within the actor data object for familiar actors. */
interface FamiliarSystemData extends Omit<FamiliarSystemSource, SourceOmission>, CreatureSystemData {
    details: FamiliarDetails;
    attack: StatisticTraceData;
    attributes: CreatureAttributes;
    master: {
        id: string | null;
        ability: AttributeString | null;
    };

    actions?: never;
    initiative?: never;
}

type SourceOmission =
    | "attributes"
    | "customModifiers"
    | "details"
    | "perception"
    | "resources"
    | "saves"
    | "skills"
    | "traits";

interface FamiliarDetails extends CreatureDetails {
    creature: {
        value: string;
    };
}

export type { FamiliarSource, FamiliarSystemData, FamiliarSystemSource };
