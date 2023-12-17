import type { ActorPF2e, ActorUpdateContext } from "@actor/base.ts";
import type { CREATURE_ACTOR_TYPES } from "@actor/values.ts";
import { AbilityItemPF2e, MeleePF2e, WeaponPF2e } from "@item";
import type { TokenDocumentPF2e } from "@scene/index.ts";

/** A `CreaturePF2e` subtype string */
type CreatureActorType = (typeof CREATURE_ACTOR_TYPES)[number];

type CreatureTrait = keyof typeof CONFIG.PF2E.creatureTraits;

/** One of the major creature types given in the Pathfinder bestiaries */
type CreatureType = keyof typeof CONFIG.PF2E.creatureTypes;

type ModeOfBeing = "living" | "undead" | "construct" | "object";

interface GetReachParameters {
    action?: "interact" | "attack";
    weapon?: Maybe<AbilityItemPF2e<ActorPF2e> | WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>>;
}

interface CreatureUpdateContext<TParent extends TokenDocumentPF2e | null> extends ActorUpdateContext<TParent> {
    allowHPOverage?: boolean;
}

export type { CreatureActorType, CreatureTrait, CreatureType, CreatureUpdateContext, GetReachParameters, ModeOfBeing };
