import { CharacterSource } from "@actor/character/data.ts";
import { CreatureType } from "@actor/creature/data.ts";
import { FamiliarSource } from "@actor/familiar/data.ts";
import { HazardSource } from "@actor/hazard/data.ts";
import { LootSource } from "@actor/loot/data.ts";
import { NPCSource } from "@actor/npc/data.ts";
import { PartySource } from "@actor/party/data.ts";
import { VehicleSource } from "@actor/vehicle/data.ts";
import { StatisticRollParameters } from "@system/statistic/index.ts";

type CreatureSource = CharacterSource | NPCSource | FamiliarSource;
type ActorType = CreatureType | "hazard" | "loot" | "party" | "vehicle";

type ActorSourcePF2e = CreatureSource | HazardSource | LootSource | PartySource | VehicleSource;

interface RollInitiativeOptionsPF2e extends RollInitiativeOptions, StatisticRollParameters {
    secret?: boolean;
}

export {
    ActorSourcePF2e,
    ActorType,
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
