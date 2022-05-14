import {
    CreatureAttributes,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureSystemData,
    SkillAbbreviation,
    CreatureSystemSource,
    CreatureTraitsData,
} from "@actor/creature/data";
import { AbilityString, Rollable } from "@actor/data/base";
import { StatisticModifier } from "@actor/modifiers";
import type { FamiliarPF2e } from ".";

type FamiliarSource = BaseCreatureSource<"familiar", FamiliarSystemSource>;

interface FamiliarData
    extends Omit<FamiliarSource, "data" | "effects" | "flags" | "items" | "token" | "type">,
        BaseCreatureData<FamiliarPF2e, "familiar", FamiliarSystemData, FamiliarSource> {}

interface FamiliarSystemSource extends Pick<CreatureSystemSource, "schema"> {
    details: {
        creature: {
            value: string;
        };
    };
    attributes: {
        hp: { value: number };
    };
    master: {
        id: string | null;
        ability: AbilityString | null;
    };
}

/** The raw information contained within the actor data object for familiar actors. */
interface FamiliarSystemData extends Omit<FamiliarSystemSource, "toggles" | "traits">, CreatureSystemData {
    details: CreatureSystemData["details"] & {
        creature: {
            value: string;
        };
    };
    actions?: undefined;
    attack: StatisticModifier & Rollable;
    attributes: FamiliarAttributes;
    skills: FamiliarSkills;
    master: {
        id: string | null;
        ability: AbilityString | null;
    };
    traits: CreatureTraitsData;
}

interface FamiliarAttributes extends CreatureAttributes {
    ac: { value: number; breakdown: string; check?: number };
    perception: FamiliarPerception;
}

type FamiliarPerception = { value: number } & StatisticModifier & Rollable;
type FamiliarSkill = StatisticModifier & Rollable & { value: number };
type FamiliarSkills = Record<SkillAbbreviation, FamiliarSkill>;

export { FamiliarData, FamiliarSource, FamiliarSystemData, FamiliarSystemSource };
