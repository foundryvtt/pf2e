import { ItemData } from "../item/dataDefinitions"
import { PF2StatisticModifier } from "../modifiers";

/** A type representing the possible ability strings. */
export type AbilityString = "str" | "dex" | "con" | "int" | "wis" | "cha";

/** Data describing the value & modifier for a base ability score. */
export interface AbilityData {
    /** The raw value of this ability score; computed from the mod for npcs automatically. */
    value: number;
    /** The minimum value this ability score can have. */
    min: number;
    /** The modifier for this ability; computed from the value for characters automatically. */
    mod: number;
}

/** Data describing the proficiency with a given martial type (such as armor proficiency). */
export interface MartialData {
    /** The proficiency rank in this martial skill (0 untrained - 4 legendary). */
    rank: number;
    /** The actual modifier for this martial type. */
    value: number;
    /** A breakdown describing the how the martial proficiency value is computed. */
    breakdown: string;
}

/** Basic save data (not including custom modifiers). */
export interface RawSaveData {
    /** The proficiency rank for this save. 0 (untrained) - 4 (legendary). */
    rank: number;
    /** The ability which this save scales off of. */
    ability: AbilityString;
    /** The raw modifier for this save (after applying all modifiers). */
    value: number;
    /** Any item-based bonuses to this save. */
    item: number;
    /** A breakdown of how the save value is determined. */
    breakdown: string;
    /** Extra, user-provided details about this save. */
    saveDetail: string;
}

/** Actions that can be called on the save data object. */
export interface RawSaveActions {
    /** Roll this save with the given options (caused by the given event, and with the given optional callback). */
    roll?: (event: any, options: string[], callback?: any) => void;
}

/** The full save data for a character; includes statistic modifier. */
export type SaveData = RawSaveData & RawSaveActions & PF2StatisticModifier;

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

    /** The three save types. */
    saves: {
        fortitude: SaveData;
        reflex: SaveData;
        will: SaveData;
    }

    /** Tracks proficiencies for martial skills. */
    martial: {
        unarmored: MartialData;
        light: MartialData;
        medium: MartialData;
        heavy: MartialData;
        simple: MartialData;
        martial: MartialData;
        advanced: MartialData;
        unarmed: MartialData;
    }

    /** Various details about the character, such as level, experience, etc. */
    details: {
        /** The amount of experience this character has. */
        xp: {
            /** The current experience value.  */
            value: number;
            /** The minimum amount of experience (almost always '0'). */
            min: number;
            /** The maximum amount of experience before level up (usually '1000', but may differ.) */
            max: number;
            /** COMPUTED: The percentage completion of the current level (value / max). */
            pct: number;
        };

        /** Information about the current character level. */
        level: {
            /** The current level of this character. */
            value: number;
            /** The minimum level (almost always '1'). */
            min: number;
        }

        [key: string]: any;
    }

    /** Various character attributes.  */
    attributes: {
        /** The amount of bonus HP gained per level (due a feat or similar). */
        levelbonushp: number;
        /** The amount of HP provided per level by the character's class. */
        classhp: number;
        /** The amount of HP provided at level 1 by the character's ancestry. */
        ancestryhp: number;
        /** A flat bonus (i.e., not scaling with level) to hit points. */
        flatbonushp: number;
        /** A flat-bonus (i.e., not scaling with level) to stamina points. */
        flatbonussp: number;
        /** Used in variant stamina rules; how much bonus SP is gained per level. */
        levelbonussp?: number;

        /** Data related to character stamina, when using the variant stamina rules. */
        sp: {
            /** The current number of stamina points. */
            value: number;
            /** The minimum number of stamina points (almost always '0'). */
            min: number;
            /** The maximum number of stamina points. */
            max: number;
            /** Any details about stamina points. */
            details: string;
        };

        /** Data related to character hitpoints. */
        hp: {
            /** The current amount of hitpoints the character has. */
            value: number;
            /** The minimum number of hitpoints this character can have; almost always 0. */
            min: number;
            /** The maximum number of hitpoints this character has. */
            max: number;
            /** If non-null, the amount of temporary hitpoints this character has. */
            temp?: number;
            /** The maximum number of temporary hitpoints this character can have. */
            tempmax?: number;
            /** Any details about hit points. */
            details: string;
        };

        [key: string]: any;
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