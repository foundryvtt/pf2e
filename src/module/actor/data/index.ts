import { CreatureType } from "@actor/creature/data";
import type { CharacterData, CharacterSource } from "@actor/character/data";
import type { HazardData, HazardSource } from "@actor/hazard/data";
import type { LootData, LootSource } from "@actor/loot/data";
import type { VehicleData, VehicleSource } from "@actor/vehicle/data";
import type { FamiliarData, FamiliarSource } from "@actor/familiar/data";
import type { NPCData, NPCSource } from "@actor/npc/data";
import { AbilityString } from "./base";
import { SAVE_TYPES } from "./values";

export type CreatureData = CharacterData | NPCData | FamiliarData;
export type ActorType = CreatureType | "hazard" | "loot" | "vehicle";

export type ActorDataPF2e = CreatureData | HazardData | LootData | VehicleData;
export type ActorSourcePF2e = ActorDataPF2e["_source"];

export type SaveType = typeof SAVE_TYPES[number];

export type ModeOfBeing = "living" | "undead" | "construct";

export {
    AbilityString,
    CharacterData,
    CharacterSource,
    NPCData,
    NPCSource,
    FamiliarData,
    FamiliarSource,
    HazardData,
    HazardSource,
    LootData,
    LootSource,
    VehicleData,
    VehicleSource,
};
