import { ItemData } from "../item/dataDefinitions"

/** Data describing the value & modifier for a base ability score. */
export interface AbilityData {
    /** The raw value of this ability score; computed from the mod for npcs automatically. */
    value: number;
    /** The minimum value this ability score can have. */
    min: number;
    /** The modifier for this ability; computed from the value for characters automatically. */
    mod: number;
}

/** The raw information contained within the actor data object for characters. */
export interface RawCharacterData {
    /** The six primary ability scores. */
    abilities: {
        str: AbilityData;
        dex: AbilityData;
        con: AbilityData;
        int: AbilityData;
        wis: AbilityData;
        cha: AbilityData;
    }

    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

/** The raw information contained within the actor data object for NPCs. */
export interface RawNpcData {
    /** The six primary ability scores. */
    abilities: {
        str: AbilityData;
        dex: AbilityData;
        con: AbilityData;
        int: AbilityData;
        wis: AbilityData;
        cha: AbilityData;
    }

    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

/** The raw information contained within the actor data object for hazards. */
export interface RawHazardData {
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

/** The raw information contained within the actor data object for loot actors. */
export interface RawLootData {
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

/** Shared type for all actor data; provides some basic information like name, the item array, token access, and so on. */
export interface ActorEntityData<T> extends BaseEntityData<T> {
    items: ItemData[];
    token?: any;
}

/** Wrapper type for character-specific data. */
export interface CharacterData extends ActorEntityData<RawCharacterData> {
    type: 'character';
}

/** Wrapper type for npc-specific data. */
export interface NpcData extends ActorEntityData<RawNpcData> {
    type: 'npc';
}

/** Wrapper type for hazard-specific data. */
export interface HazardData extends ActorEntityData<RawHazardData> {
    type: 'hazard';
}

/** Wrapper type for loot-specific data. */
export interface LootData extends ActorEntityData<RawLootData> {
    type: 'loot';
}

export type ActorData = CharacterData | NpcData | HazardData | LootData;