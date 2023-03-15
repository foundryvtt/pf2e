import { CharacterSource } from "@actor/character/data";
import { CreatureType } from "@actor/creature/data";
import { FamiliarSource } from "@actor/familiar/data";
import { HazardSource } from "@actor/hazard/data";
import { LootSource } from "@actor/loot/data";
import { NPCSource } from "@actor/npc/data";
import { PartySource } from "@actor/party/data";
import { VehicleSource } from "@actor/vehicle/data";

type CreatureSource = CharacterSource | NPCSource | FamiliarSource;
type ActorType = CreatureType | "hazard" | "loot" | "party" | "vehicle";

type ActorSourcePF2e = CreatureSource | HazardSource | LootSource | PartySource | VehicleSource;

interface RollInitiativeOptionsPF2e extends RollInitiativeOptions {
    secret?: boolean;
    skipDialog?: boolean;
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
