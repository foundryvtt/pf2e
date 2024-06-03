import { AttributeString, ImmunityType, ResistanceType, SkillSlug, WeaknessType } from "@actor/types.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr.ts";

const ATTRIBUTE_ABBREVIATIONS = new Set(["str", "dex", "con", "int", "wis", "cha"] as const);

const CREATURE_ACTOR_TYPES = ["character", "npc", "familiar"] as const;

const ACTOR_TYPES = ["army", "character", "familiar", "hazard", "loot", "npc", "party", "vehicle"] as const;

const SAVE_TYPES = ["fortitude", "reflex", "will"] as const;

const IMMUNITY_TYPES = new Set(Object.keys(immunityTypes)) as Set<ImmunityType>;

const WEAKNESS_TYPES = new Set(Object.keys(weaknessTypes)) as Set<WeaknessType>;

const RESISTANCE_TYPES = new Set(Object.keys(resistanceTypes)) as Set<ResistanceType>;

const UNAFFECTED_TYPES = new Set(["bleed", "good", "evil", "lawful", "chaotic", "spirit", "vitality", "void"] as const);

const SKILL_SLUGS = new Set([
    "acrobatics",
    "arcana",
    "athletics",
    "crafting",
    "deception",
    "diplomacy",
    "intimidation",
    "medicine",
    "nature",
    "occultism",
    "performance",
    "religion",
    "society",
    "stealth",
    "survival",
    "thievery",
] as const);

const DC_SLUGS = new Set(["ac", "armor", "perception", ...SAVE_TYPES, ...SKILL_SLUGS] as const);

interface SkillExpanded {
    attribute: AttributeString;
}

const SKILL_EXPANDED: Record<SkillSlug, SkillExpanded> = {
    acrobatics: { attribute: "dex" },
    arcana: { attribute: "int" },
    athletics: { attribute: "str" },
    crafting: { attribute: "int" },
    deception: { attribute: "cha" },
    diplomacy: { attribute: "cha" },
    intimidation: { attribute: "cha" },
    medicine: { attribute: "wis" },
    nature: { attribute: "wis" },
    occultism: { attribute: "int" },
    performance: { attribute: "cha" },
    religion: { attribute: "wis" },
    society: { attribute: "int" },
    stealth: { attribute: "dex" },
    survival: { attribute: "wis" },
    thievery: { attribute: "dex" },
};

const MOVEMENT_TYPES = ["land", "burrow", "climb", "fly", "swim"] as const;

/** Actor types that are valid for token size linking */
const SIZE_LINKABLE_ACTOR_TYPES = new Set([...CREATURE_ACTOR_TYPES, "vehicle"]);

export {
    ACTOR_TYPES,
    ATTRIBUTE_ABBREVIATIONS,
    CREATURE_ACTOR_TYPES,
    DC_SLUGS,
    IMMUNITY_TYPES,
    MOVEMENT_TYPES,
    RESISTANCE_TYPES,
    SAVE_TYPES,
    SIZE_LINKABLE_ACTOR_TYPES,
    SKILL_EXPANDED,
    SKILL_SLUGS,
    UNAFFECTED_TYPES,
    WEAKNESS_TYPES,
};
