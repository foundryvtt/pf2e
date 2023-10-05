import {
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureDetailsSource,
    CreatureSystemData,
    CreatureSystemSource,
    CreatureTraitsData,
} from "@actor/creature/data.ts";
import type { CreatureSensePF2e } from "@actor/creature/sense.ts";
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
    resources?: never;
    saves?: never;
    skills?: never;
    traits?: never;
}

interface FamiliarAttributesSource {
    hp: { value: number };
    initiative?: never;
    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface FamiliarDetailsSource extends CreatureDetailsSource {
    creature: {
        value: string;
    };
    readonly alliance?: never;
    readonly level?: never;
}

/** The raw information contained within the actor data object for familiar actors. */
interface FamiliarSystemData extends Omit<FamiliarSystemSource, SourceOmission>, CreatureSystemData {
    details: FamiliarDetails;
    actions?: never;
    attack: StatisticTraceData;
    attributes: FamiliarAttributes;
    master: {
        id: string | null;
        ability: AttributeString | null;
    };
    traits: FamiliarTraitsData;
}

type SourceOmission =
    | "attributes"
    | "customModifiers"
    | "details"
    | "toggles"
    | "resources"
    | "saves"
    | "skills"
    | "traits";

interface FamiliarAttributes extends CreatureAttributes {
    ac: { value: number; breakdown: string; check?: number };
    initiative?: never;
}

interface FamiliarDetails extends CreatureDetails {
    creature: {
        value: string;
    };
}

interface FamiliarTraitsData extends CreatureTraitsData {
    senses: CreatureSensePF2e[];
}

export type { FamiliarSource, FamiliarSystemData, FamiliarSystemSource };
