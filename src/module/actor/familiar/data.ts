import {
    BaseCreatureData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureSystemData,
    CreatureSystemSource,
    CreatureTraitsData,
    SkillAbbreviation,
} from "@actor/creature/data";
import { CreatureSensePF2e } from "@actor/creature/sense";
import { Rollable } from "@actor/data/base";
import { StatisticModifier } from "@actor/modifiers";
import { AbilityString } from "@actor/types";
import type { FamiliarPF2e } from ".";

type FamiliarSource = BaseCreatureSource<"familiar", FamiliarSystemSource>;

interface FamiliarData
    extends Omit<FamiliarSource, "data" | "system" | "effects" | "flags" | "items" | "prototypeToken" | "type">,
        BaseCreatureData<FamiliarPF2e, "familiar", FamiliarSystemData, FamiliarSource> {}

interface FamiliarSystemSource extends Pick<CreatureSystemSource, "schema" | "traits"> {
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

    customModifiers?: never;

    resources?: never;
}

/** The raw information contained within the actor data object for familiar actors. */
interface FamiliarSystemData extends Omit<FamiliarSystemSource, "toggles" | "customModifiers">, CreatureSystemData {
    details: CreatureSystemData["details"] & {
        creature: {
            value: string;
        };
    };
    actions?: never;
    attack: StatisticModifier & Rollable;
    attributes: FamiliarAttributes;
    skills: FamiliarSkills;
    master: {
        id: string | null;
        ability: AbilityString | null;
    };
    traits: FamiliarTraitsData;
}

interface FamiliarAttributes extends CreatureAttributes {
    ac: { value: number; breakdown: string; check?: number };
    perception: FamiliarPerception;
}

type FamiliarPerception = { value: number } & StatisticModifier & Rollable;
type FamiliarSkill = StatisticModifier & Rollable & { value: number };
type FamiliarSkills = Record<SkillAbbreviation, FamiliarSkill>;

interface FamiliarTraitsData extends CreatureTraitsData {
    senses: CreatureSensePF2e[];
}

export { FamiliarData, FamiliarSource, FamiliarSystemData, FamiliarSystemSource };
