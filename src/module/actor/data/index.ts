import { ArmySource } from "@actor/army/data.ts";
import { CharacterSource } from "@actor/character/data.ts";
import { FamiliarSource } from "@actor/familiar/data.ts";
import { HazardSource } from "@actor/hazard/data.ts";
import { LootSource } from "@actor/loot/data.ts";
import { NPCSource } from "@actor/npc/data.ts";
import { PartySource } from "@actor/party/data.ts";
import { VehicleSource } from "@actor/vehicle/data.ts";
import { StatisticRollParameters } from "@system/statistic/index.ts";

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
