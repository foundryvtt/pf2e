import type { ArmySource } from "@actor/army/data.ts";
import type { CharacterSource } from "@actor/character/data.ts";
import type { FamiliarSource } from "@actor/familiar/data.ts";
import type { HazardSource } from "@actor/hazard/data.ts";
import type { LootSource } from "@actor/loot/data.ts";
import type { NPCSource } from "@actor/npc/data.ts";
import type { PartySource } from "@actor/party/data.ts";
import type { VehicleSource } from "@actor/vehicle/data.ts";
import type { RollInitiativeOptions } from "@client/documents/combat.d.mts";
import type { StatisticRollParameters } from "@system/statistic/index.ts";

type CreatureSource = CharacterSource | NPCSource | FamiliarSource;

type ActorSourcePF2e = ArmySource | CreatureSource | HazardSource | LootSource | PartySource | VehicleSource;

interface RollInitiativeOptionsPF2e extends RollInitiativeOptions, StatisticRollParameters {
    secret?: boolean;
}

export type {
    ActorSourcePF2e,
    ArmySource,
    CharacterSource,
    CreatureSource,
    FamiliarSource,
    HazardSource,
    LootSource,
    NPCSource,
    PartySource,
    RollInitiativeOptionsPF2e,
    VehicleSource,
};
