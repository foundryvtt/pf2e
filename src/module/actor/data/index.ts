import { CreatureType } from "@actor/creature/data";
import type { CharacterData, CharacterSource } from "@actor/character/data";
import type { HazardData, HazardSource } from "@actor/hazard/data";
import type { LootData, LootSource } from "@actor/loot/data";
import type { VehicleData, VehicleSource } from "@actor/vehicle/data";
import type { FamiliarData, FamiliarSource } from "@actor/familiar/data";
import type { NPCData, NPCSource } from "@actor/npc/data";
import { AbilityString } from "./base";
import { SAVE_TYPES } from "./values";
import { DCSlug, SaveType } from "./types";

type CreatureData = CharacterData | NPCData | FamiliarData;
type ActorType = CreatureType | "hazard" | "loot" | "vehicle";

type ActorDataPF2e = CreatureData | HazardData | LootData | VehicleData;
type ActorSourcePF2e = ActorDataPF2e["_source"];

type ModeOfBeing = "living" | "undead" | "construct" | "object";

interface RollInitiativeOptionsPF2e extends RollInitiativeOptions {
    secret?: boolean;
    skipDialog?: boolean;
}
export {
    AbilityString,
    ActorDataPF2e,
    ActorSourcePF2e,
    ActorType,
    CharacterData,
    CharacterSource,
    CreatureData,
    DCSlug,
    FamiliarData,
    FamiliarSource,
    HazardData,
    HazardSource,
    LootData,
    LootSource,
    ModeOfBeing,
    NPCData,
    NPCSource,
    RollInitiativeOptionsPF2e,
    SAVE_TYPES,
    SaveType,
    VehicleData,
    VehicleSource,
};
