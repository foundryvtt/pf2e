import { ItemTrait } from "@item/data/base";
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

interface AuraData {
    slug: string;
    radius: number;
    effects: AuraEffectData[];
    colors: AuraColors | null;
    traits: ItemTrait[];
}

interface AuraEffectData {
    uuid: string;
    level: number | null;
    affects: "allies" | "enemies" | "all";
    events: ("enter" | "turn-start" | "turn-end")[];
    save: {
        type: SaveType;
        dc: number;
    } | null;
    removeOnExit: boolean;
}

interface AuraColors {
    border: `#${string}`;
    fill: `#${string}`;
}

export {
    AbilityString,
    ActorAlliance,
    ActorDimensions,
    AuraColors,
    AuraData,
    AuraEffectData,
    DCSlug,
    SaveType,
    SkillAbbreviation,
    SkillLongForm,
};
