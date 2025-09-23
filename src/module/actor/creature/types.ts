import type { ActorPF2e, ActorUpdateCallbackOptions, ActorUpdateOperation } from "@actor/base.ts";
import type { MovementType } from "@actor/types.ts";
import type { CREATURE_ACTOR_TYPES } from "@actor/values.ts";
import type { AbilityItemPF2e, MeleePF2e, WeaponPF2e } from "@item";
import type { LabeledValueAndMax } from "@module/data.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import type { SpeedStatistic } from "@system/statistic/speed.ts";
import type { CreaturePF2e } from "./document.ts";
import { CreatureMovementData } from "./index.ts";
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

type OtherCreatureSpeeds<A extends CreaturePF2e> = {
    [T in Exclude<MovementType, "land">]: SpeedStatistic<A, T> | null;
};
interface CreatureSpeeds<TActor extends CreaturePF2e> extends OtherCreatureSpeeds<TActor> {
    land: SpeedStatistic<TActor, "land">;
    travel: SpeedStatistic<TActor, "travel">;
}

interface CreatureMovement<TActor extends CreaturePF2e> {
    speeds: CreatureSpeeds<TActor>;
    terrain: CreatureMovementData["terrain"];
}

interface GetReachParameters {
    action?: "interact" | "attack";
    weapon?: Maybe<AbilityItemPF2e<ActorPF2e> | WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>>;
}

interface CreatureUpdateOperation<TParent extends TokenDocumentPF2e | null> extends ActorUpdateOperation<TParent> {
    allowHPOverage?: boolean;
}

interface CreatureUpdateCallbackOptions extends ActorUpdateCallbackOptions {
    allowHPOverage?: boolean;
}

interface ResourceData extends LabeledValueAndMax {
    slug: string;
}

export type {
    Attitude,
    CreatureActorType,
    CreatureMovement,
    CreatureSpeeds,
    CreatureTrait,
    CreatureType,
    CreatureUpdateCallbackOptions,
    CreatureUpdateOperation,
    GetReachParameters,
    Language,
    ModeOfBeing,
    ResourceData,
    SenseAcuity,
    SenseType,
    SpecialVisionType,
};
