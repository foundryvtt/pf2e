import { ABILITY_ABBREVIATIONS, DC_SLUGS, SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_LONG_FORMS } from "./values";

type AbilityString = SetElement<typeof ABILITY_ABBREVIATIONS>;

interface ActorDimensions {
    length: number;
    width: number;
    height: number;
}

type SkillAbbreviation = SetElement<typeof SKILL_ABBREVIATIONS>;
type SkillLongForm = SetElement<typeof SKILL_LONG_FORMS>;

type ActorAlliance = "party" | "opposition" | null;

type DCSlug = SetElement<typeof DC_SLUGS>;

type SaveType = typeof SAVE_TYPES[number];

export { AbilityString, ActorAlliance, ActorDimensions, DCSlug, SaveType, SkillAbbreviation, SkillLongForm };
