import type { ActorPF2e, ActorUpdateContext } from "@actor/base.ts";
import type { CREATURE_ACTOR_TYPES } from "@actor/values.ts";
import type { AbilityItemPF2e, MeleePF2e, WeaponPF2e } from "@item";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import type { LANGUAGES_BY_RARITY, SENSE_TYPES } from "./values.ts";

/** A `CreaturePF2e` subtype string */
type CreatureActorType = (typeof CREATURE_ACTOR_TYPES)[number];

type CreatureTrait = keyof typeof CONFIG.PF2E.creatureTraits;

/** One of the major creature types given in the Pathfinder bestiaries */
type CreatureType = keyof typeof CONFIG.PF2E.creatureTypes;

type Language =
    | "common"
    | (typeof LANGUAGES_BY_RARITY.common)[number]
    | (typeof LANGUAGES_BY_RARITY.uncommon)[number]
    | (typeof LANGUAGES_BY_RARITY.rare)[number]
    | (typeof LANGUAGES_BY_RARITY.secret)[number];
type Attitude = keyof typeof CONFIG.PF2E.attitude;

type ModeOfBeing = "living" | "undead" | "construct" | "object";

type SenseAcuity = "precise" | "imprecise" | "vague";
type SenseType = SetElement<typeof SENSE_TYPES>;
type SpecialVisionType = Extract<
    SenseType,
    "low-light-vision" | "darkvision" | "greater-darkvision" | "see-invisibility"
>;

interface GetReachParameters {
    action?: "interact" | "attack";
    weapon?: Maybe<AbilityItemPF2e<ActorPF2e> | WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>>;
}

interface CreatureUpdateContext<TParent extends TokenDocumentPF2e | null> extends ActorUpdateContext<TParent> {
    allowHPOverage?: boolean;
}

export type {
    Attitude,
    CreatureActorType,
    CreatureTrait,
    CreatureType,
    CreatureUpdateContext,
    GetReachParameters,
    Language,
    ModeOfBeing,
    SenseAcuity,
    SenseType,
    SpecialVisionType,
};
