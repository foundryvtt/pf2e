import type { ImmunityType, ResistanceType, WeaknessType } from "@actor/types.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr.ts";
import * as R from "remeda";

const ATTRIBUTE_ABBREVIATIONS = new Set(["str", "dex", "con", "int", "wis", "cha"] as const);

const CREATURE_ACTOR_TYPES = ["character", "npc", "familiar"] as const;

const ACTOR_TYPES = ["army", "character", "familiar", "hazard", "loot", "npc", "party", "vehicle"] as const;

const SAVE_TYPES = ["fortitude", "reflex", "will"] as const;

const IMMUNITY_TYPES: Set<ImmunityType> = new Set(R.keys(immunityTypes));

const WEAKNESS_TYPES: Set<WeaknessType> = new Set(R.keys(weaknessTypes));

const RESISTANCE_TYPES: Set<ResistanceType> = new Set(R.keys(resistanceTypes));

const UNAFFECTED_TYPES = new Set(["bleed", "good", "evil", "lawful", "chaotic", "spirit", "vitality", "void"] as const);

/** All skill slugs that are part of the core system. Used for validation. */
const CORE_SKILL_SLUGS = new Set([
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

const MOVEMENT_TYPES = ["land", "burrow", "climb", "fly", "swim"] as const;

/** Actor types that are valid for token size linking */
const SIZE_LINKABLE_ACTOR_TYPES = new Set([...CREATURE_ACTOR_TYPES, "vehicle"]);

export {
    ACTOR_TYPES,
    ATTRIBUTE_ABBREVIATIONS,
    CORE_SKILL_SLUGS,
    CREATURE_ACTOR_TYPES,
    IMMUNITY_TYPES,
    MOVEMENT_TYPES,
    RESISTANCE_TYPES,
    SAVE_TYPES,
    SIZE_LINKABLE_ACTOR_TYPES,
    UNAFFECTED_TYPES,
    WEAKNESS_TYPES,
};
