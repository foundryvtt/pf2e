import {
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

type FamiliarSource = BaseCreatureSource<"familiar", FamiliarSystemSource>;

interface FamiliarSystemSource extends Pick<CreatureSystemSource, "schema"> {
    details: {
        creature: {
            value: string;
        };
    };
    attributes: FamiliarAttributesSource;
    master: {
        id: string | null;
        ability: AbilityString | null;
    };

    customModifiers?: never;

    resources?: never;

    traits?: never;
}

/** The raw information contained within the actor data object for familiar actors. */
interface FamiliarSystemData
    extends Omit<FamiliarSystemSource, "attributes" | "customModifiers" | "toggles" | "resources" | "traits">,
        CreatureSystemData {
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

interface FamiliarAttributesSource {
    hp: { value: number };
    initiative?: never;
    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface FamiliarAttributes extends CreatureAttributes {
    ac: { value: number; breakdown: string; check?: number };
    perception: FamiliarPerception;
    initiative?: never;
}

type FamiliarPerception = { value: number } & StatisticModifier & Rollable;
type FamiliarSkill = StatisticModifier & Rollable & { value: number; ability: AbilityString; visible?: boolean };
type FamiliarSkills = Record<SkillAbbreviation, FamiliarSkill>;

interface FamiliarTraitsData extends CreatureTraitsData {
    senses: CreatureSensePF2e[];
}

export { FamiliarSource, FamiliarSystemData, FamiliarSystemSource };
