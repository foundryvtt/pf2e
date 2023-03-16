import { ArmySource } from "@actor/army";
import { CharacterSource } from "@actor/character/data";
import { CreatureType } from "@actor/creature/data";
import { FamiliarSource } from "@actor/familiar/data";
import { HazardSource } from "@actor/hazard/data";
import { LootSource } from "@actor/loot/data";
import { NPCSource } from "@actor/npc/data";
import { PartySource } from "@actor/party/data";
import { VehicleSource } from "@actor/vehicle/data";

type CreatureSource = CharacterSource | NPCSource | FamiliarSource;
type ActorType = CreatureType | "army" | "hazard" | "loot" | "party" | "vehicle";

type ActorSourcePF2e = CreatureSource | ArmySource | HazardSource | LootSource | PartySource | VehicleSource;

interface RollInitiativeOptionsPF2e extends RollInitiativeOptions, StatisticRollParameters {
    secret?: boolean;
}

export {
    ActorSourcePF2e,
    ActorType,
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
