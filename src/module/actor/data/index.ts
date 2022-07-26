import type { CharacterData, CharacterSource } from "@actor/character/data";
import { CreatureType } from "@actor/creature/data";
import type { FamiliarData, FamiliarSource } from "@actor/familiar/data";
import type { HazardData, HazardSource } from "@actor/hazard/data";
import type { LootData, LootSource } from "@actor/loot/data";
import type { NPCData, NPCSource } from "@actor/npc/data";
import type { SiegeWeaponData, SiegeWeaponSource } from "@actor/siege-weapon/data";
import type { VehicleData, VehicleSource } from "@actor/vehicle/data";

type CreatureData = CharacterData | NPCData | FamiliarData;
type ActorType = CreatureType | "hazard" | "loot" | "siegeWeapon" | "vehicle";

type ActorDataPF2e = CreatureData | HazardData | LootData | SiegeWeaponData | VehicleData;
type ActorSourcePF2e = ActorDataPF2e["_source"];

interface RollInitiativeOptionsPF2e extends RollInitiativeOptions {
    secret?: boolean;
    skipDialog?: boolean;
}
export {
    ActorDataPF2e,
    ActorSourcePF2e,
    ActorType,
    CharacterData,
    CharacterSource,
    CreatureData,
    FamiliarData,
    FamiliarSource,
    HazardData,
    HazardSource,
    LootData,
    LootSource,
    NPCData,
    NPCSource,
    RollInitiativeOptionsPF2e,
    SiegeWeaponData,
    SiegeWeaponSource,
    VehicleData,
    VehicleSource,
};
