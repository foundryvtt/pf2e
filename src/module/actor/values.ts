import { SkillAbbreviation } from "@actor/creature/data.ts";
import { AttributeString, ImmunityType, ResistanceType, SkillLongForm, WeaknessType } from "@actor/types.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr.ts";

const ATTRIBUTE_ABBREVIATIONS = new Set(["str", "dex", "con", "int", "wis", "cha"] as const);

const CREATURE_ACTOR_TYPES = ["character", "npc", "familiar"] as const;

const SAVE_TYPES = ["fortitude", "reflex", "will"] as const;

const IMMUNITY_TYPES = new Set(Object.keys(immunityTypes)) as Set<ImmunityType>;

const WEAKNESS_TYPES = new Set(Object.keys(weaknessTypes)) as Set<WeaknessType>;

const RESISTANCE_TYPES = new Set(Object.keys(resistanceTypes)) as Set<ResistanceType>;

const UNAFFECTED_TYPES = new Set(["bleed", "good", "evil", "lawful", "chaotic", "spirit", "vitality", "void"] as const);

const SKILL_ABBREVIATIONS = new Set([
    "acr",
    "arc",
    "ath",
    "cra",
    "dec",
    "dip",
    "itm",
    "med",
    "nat",
    "occ",
    "prf",
    "rel",
    "soc",
    "ste",
    "sur",
    "thi",
] as const);

const SKILL_DICTIONARY = {
    acr: "acrobatics",
    arc: "arcana",
    ath: "athletics",
    cra: "crafting",
    dec: "deception",
    dip: "diplomacy",
    itm: "intimidation",
    med: "medicine",
    nat: "nature",
    occ: "occultism",
    prf: "performance",
    rel: "religion",
    soc: "society",
    ste: "stealth",
    sur: "survival",
    thi: "thievery",
} as const;

const SKILL_LONG_FORMS = new Set(Object.values(SKILL_DICTIONARY));

const SKILL_DICTIONARY_REVERSE = Object.fromEntries(
    Object.entries(SKILL_DICTIONARY).map(([abbrev, value]) => [value, abbrev] as [SkillLongForm, SkillAbbreviation]),
);

const DC_SLUGS = new Set(["ac", "armor", "perception", ...SAVE_TYPES, ...SKILL_LONG_FORMS] as const);

interface SkillExpanded {
    attribute: AttributeString;
    shortForm: SkillAbbreviation;
}

const SKILL_EXPANDED: Record<SkillLongForm, SkillExpanded> = {
    acrobatics: { attribute: "dex", shortForm: "acr" },
    arcana: { attribute: "int", shortForm: "arc" },
    athletics: { attribute: "str", shortForm: "ath" },
    crafting: { attribute: "int", shortForm: "cra" },
    deception: { attribute: "cha", shortForm: "dec" },
    diplomacy: { attribute: "cha", shortForm: "dip" },
    intimidation: { attribute: "cha", shortForm: "itm" },
    medicine: { attribute: "wis", shortForm: "med" },
    nature: { attribute: "wis", shortForm: "nat" },
    occultism: { attribute: "int", shortForm: "occ" },
    performance: { attribute: "cha", shortForm: "prf" },
    religion: { attribute: "wis", shortForm: "rel" },
    society: { attribute: "int", shortForm: "soc" },
    stealth: { attribute: "dex", shortForm: "ste" },
    survival: { attribute: "wis", shortForm: "sur" },
    thievery: { attribute: "dex", shortForm: "thi" },
};

const MOVEMENT_TYPES = ["land", "burrow", "climb", "fly", "swim"] as const;

/** Actor types that are valid for token size linking */
const SIZE_LINKABLE_ACTOR_TYPES = new Set([...CREATURE_ACTOR_TYPES, "vehicle"]);

export {
    ATTRIBUTE_ABBREVIATIONS,
    CREATURE_ACTOR_TYPES,
    DC_SLUGS,
    IMMUNITY_TYPES,
    MOVEMENT_TYPES,
    RESISTANCE_TYPES,
    SAVE_TYPES,
    SIZE_LINKABLE_ACTOR_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_DICTIONARY,
    SKILL_DICTIONARY_REVERSE,
    SKILL_EXPANDED,
    SKILL_LONG_FORMS,
    UNAFFECTED_TYPES,
    WEAKNESS_TYPES,
};
