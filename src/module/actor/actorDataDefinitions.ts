import { ItemData } from "../item/dataDefinitions"
import { PF2StatisticModifier, PF2CheckModifier } from "../modifiers";

/** A type representing the possible ability strings. */
export type AbilityString = "str" | "dex" | "con" | "int" | "wis" | "cha";

/** Generic { value, label, type } type used in various places in data types. */
export interface LabeledValue {
    label: string;
    value: string;
    type: string;
    exceptions: string;
}

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

/** Basic skill and save data (not including custom modifiers). */
export interface RawSkillData {
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
    /** If set, this skill is affected by the armor check penalty. */
    armor?: number;
}

/** Basic initiative-relevant data. */
export interface RawInitiativeData {
    /** What skill or ability is currently being used to compute initiative. */
    ability: string;
    /** The textual name for what type of initiative is being rolled (usually includes the skill). */
    label: string;
}

/** Any skill or similar which provides a roll option for rolling this save. */
export interface Rollable {
    /** Roll this save or skill with the given options (caused by the given event, and with the given optional callback). */
    roll?: (event: any, options: string[], callback?: any) => void;
}

/** The full data for charatcer initiative. */
export type InitiativeData = PF2CheckModifier & RawInitiativeData & Rollable;
/** The full data for character perception rolls (which behave similarly to skills). */
export type PerceptionData = PF2StatisticModifier & RawSkillData & Rollable;
/** The full data for character AC; includes the armor check penalty. */
export type ArmorClassData = PF2StatisticModifier & RawSkillData & { check?: number; };
/** The full data for the class DC; similar to SkillData, but is not rollable. */
export type ClassDCData = PF2StatisticModifier & RawSkillData;
/** The full skill data for a character; includes statistic modifier. */
export type SkillData = PF2StatisticModifier & RawSkillData & Rollable;
/** The full save data for a character; includes statistic modifier and an extra `saveDetail` field for user-provided details. */
export type SaveData = SkillData & { saveDetail?: string };

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
        /** The key ability which class saves (and other class-related things) scale off of. */
        keyability: { value: AbilityString; };

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
        /** The perception skill. */
        perception: PerceptionData;
        /** The class DC, used for saves related to class abilities. */
        classDC: ClassDCData;
        /** Creature armor class, used to defend against attacks. */
        ac: ArmorClassData;
        /** Initiative, used to determine turn order in combat. */
        initiative: InitiativeData;

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

        /** A bonus to the maximum amount of bulk that this character can carry. */
        bonusLimitBulk: number;
        /** A bonus to the maximum amount of bulk that this character can carry without being encumbered. */
        bonusEncumbranceBulk: number;

        /** The current dying level (and maximum) for this character. */
        dying: { value: number; max: number; }
        /** The current wounded level (and maximum) for this character. */
        wounded: { value: number; max: number; }
        /** The current doomed level (and maximum) for this character. */
        doomed: { value: number; max: number; }
        /** The current number of hero points (and maximum) for this character. */
        heroPoints: { rank: number; max: number; }

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

        /**
         * Data related to the currently equipped shield. This is copied from the shield data itself, and exists to
         * allow for the shield health to be shown in a token.
         */
        shield: {
            /** The current shield health. */
            value: number;
            /** The maximum shield health. */
            max: number;
        };

        /** Records the various land/swim/fly speeds that this actor has. */
        speed: {
            /** The actor's primary speed (usually walking/stride speed). */
            value: string;
            /** @deprecated Any special speeds this actor has; prefer using `otherSpeeds`. */
            special: string;
            /** Other speeds that this actor can use (such as swim, climb, etc). */
            otherSpeeds: LabeledValue[];
        }

        /** Used in the variant stamina rules; a resource expended to regain stamina/hp. */
        resolve: { value: number; }
    }

    /** Player skills, used for various skill checks. */
    skills: {
        acr: SkillData;
        arc: SkillData;
        ath: SkillData;
        cra: SkillData;
        dec: SkillData;
        dip: SkillData;
        itm: SkillData;
        med: SkillData;
        nat: SkillData;
        occ: SkillData;
        prf: SkillData;
        rel: SkillData;
        soc: SkillData;
        ste: SkillData;
        sur: SkillData;
        thi: SkillData;
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