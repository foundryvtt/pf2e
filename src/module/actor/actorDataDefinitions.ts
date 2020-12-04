import { ItemData } from "../item/dataDefinitions"
import { PF2StatisticModifier, PF2CheckModifier, PF2Modifier, PF2DamageDice } from "../modifiers";
import { Build } from "../system/characterbuilder";

/** A type representing the possible ability strings. */
export type AbilityString = "str" | "dex" | "con" | "int" | "wis" | "cha";

/** A type representing the possible PFS factions. */
export type PFSFactionString = "EA" | "GA" | "HH" | "VS" | "RO" | "VW";

/** A type representing the possible PFS schools. */
export type PFSSchoolString = "none" | "scrolls" | "spells" | "swords";

/** A roll function which can be called to roll a given skill. */
export type RollFunction = (event: any, options: string[], callback?: any) => void;

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

/** Single source of a Dexterity modifier cap to Armor Class, including the cap value itself. */
export interface DexterityModifierCapData {
    /** The numeric value that constitutes the maximum Dexterity modifier. */
    value: number;
    /** The source of this Dex cap - usually the name of an armor, a monk stance, or a spell. */
    source: string;
}

/** Any skill or similar which provides a roll option for rolling this save. */
export interface Rollable {
    /** Roll this save or skill with the given options (caused by the given event, and with the given optional callback). */
    roll?: RollFunction;
}

export interface CharacterStrikeTrait {
    /** The name of this action. */
    name: string;
    /** The label for this action which will be rendered on the UI. */
    label: string;
    /** If true, this trait is toggleable. */
    toggle: boolean;
    /** The roll this trait applies to, if relevant. */
    rollName?: string;
    /** The option that this trait applies to the roll (of type `rollName`). */
    rollOption?: string;
    /** An extra css class added to the UI marker for this trait. */
    cssClass?: string;
}

/** An strike which a character can use. */
export interface RawCharacterStrike {
    /** The type of action; currently just 'strike'. */
    type: 'strike';
    /** The image URL for this strike (shown on the UI). */
    imageUrl: string;
    /** The glyph for this strike (how many actions it takes, reaction, etc). */
    glyph: string;
    /** A description of this strike. */
    description: string;
    /** A description of what happens on a critical success. */
    criticalSuccess: string;
    /** A description of what happens on a success. */
    success: string;
    /** Any traits this strike has. */
    traits: CharacterStrikeTrait[];

    /** Alias for `attack`. */
    roll?: RollFunction;
    /** Roll to attack with the given strike (with no MAP penalty; see `variants` for MAP penalties.) */
    attack?: RollFunction;
    /** Roll normal (non-critical) damage for this weapon. */
    damage?: RollFunction;
    /** Roll critical damage for this weapon. */
    critical?: RollFunction;

    /** A list of attack variants which apply the Multiple Attack Penalty. */
    variants: { label: string; roll: RollFunction; }[]
}

/** Basic hitpoints data fields */
export interface RawHitPointsData {
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
}

/** Pathfinder Society Organized Play data fields */
export interface RawPathfinderSocietyData {
    /** Number assigned to the player. */
    playerNumber: string;
    /** Number assigned to the character. */
    characterNumber: string;
    /** Is the character currently affected by a level bump? */
    levelBump: boolean;
    /** Character's current fame */
    fame: number;
    /** Character's currently slotted faction */
    currentFaction: PFSFactionString;

    /** Character's Pathfinder school */
    school: PFSSchoolString;

    /** Character's Reputation with all the factions */
    reputation: PathfinderSocietyReputation;
}

/** PFS faction reputation values */
export interface PathfinderSocietyReputation {
    EA: number,
    GA: number,
    HH: number,
    VS: number,
    RO: number,
    VW: number
}

/** Data related to character hitpoints. */
export type HitPointsData = PF2StatisticModifier & RawHitPointsData;
/** The full data for charatcer initiative. */
export type InitiativeData = PF2CheckModifier & RawInitiativeData & Rollable;
/** The full data for character perception rolls (which behave similarly to skills). */
export type PerceptionData = PF2StatisticModifier & RawSkillData & Rollable;
/** The full data for character AC; includes the armor check penalty. */
export type ArmorClassData = PF2StatisticModifier & RawSkillData & {
    /** The armor check penalty imposed by the worn armor. */
    check?: number;
    /** The cap for the bonus that dexterity can give to AC, if any. If null, there is no cap. */
    dexCap?: DexterityModifierCapData;
};
/** The full data for the class DC; similar to SkillData, but is not rollable. */
export type ClassDCData = PF2StatisticModifier & RawSkillData;
/** The full skill data for a character; includes statistic modifier. */
export type SkillData = PF2StatisticModifier & RawSkillData & Rollable;
/** The full save data for a character; includes statistic modifier and an extra `saveDetail` field for user-provided details. */
export type SaveData = SkillData & { saveDetail?: string };
/** The full data for a character action (used primarily for strikes.) */
export type CharacterStrike = PF2StatisticModifier & RawCharacterStrike;

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

        /** Character alignment (LN, N, NG, etc.) */
        alignment: { value: string; }
        /** Character class ('barbarian', 'fighter', etc.) */
        class: { value: string; }
        /** Character ancestry (their race, generally). */
        ancestry: { value: string; }
        /** Character heritage (what specific kind of race they are, like 'Warmarch Hobgoblin'). */
        heritage: { value: string; }
        /** The diety that the character worships (and an image of the diety symbol). */
        deity: { value: string, image: string; }
        /** Character background - their occupation, upbringing, etc. */
        background: { value: string; }
        /** How old the character is (user-provided field). */
        age: { value: string; }
        /** Character height (user-provided field). */
        height: { value: string; }
        /** Character weight (user-provided field). */
        weight: { value: string; }
        /** Character gender/pronouns (user-provided field). */
        gender: { value: string; }
        /** Character ethnicity (user-provided field). */
        ethnicity: { value: string; }
        /** Character nationality (i.e, what nation they hail from; user-provided field). */
        nationality: { value: string; }
        /** User-provided biography for their character; value is HTML. */
        biography: { value: string; public?: string; }

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

        /** Dexterity modifier cap to AC. Undefined means no limit. */
        dexCap: DexterityModifierCapData[];

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

        /** The number of familiar abilities this character's familiar has access to. */
        familiarAbilities: number;

        /** Data related to character hitpoints. */
        hp: HitPointsData;

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

    /** Custom character traits, such as damage resistances/immunities. */
    traits: {
        /** The character size (such as 'med'). */
        size: { value: string; }
        /** A list of special senses this character has. */
        senses: LabeledValue[];
        /** Traits which apply to this actor, like 'air' or 'extradimensional' */
        traits: { value: string[]; custom: string; }
        /** Languages which this actor knows and can speak. */
        languages: { value: string[]; selected: string[]; custom: string; }
        /** Damage immunities this actor has. */
        di: { value: string[]; custom: string; }
        /** Damage resistances that this actor has. */
        dr: LabeledValue[];
        /** Damage vulnerabilities that this actor has. */
        dv: LabeledValue[];
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

    /** Maps roll types -> a list of modifiers which should affect that roll type. */
    customModifiers: Record<string, PF2Modifier[]>;
    /** Maps damage roll types -> a list of damage dice which should be added to that damage roll type. */
    damageDice: Record<string, PF2DamageDice[]>;

    /** Pathfinder Society Organized Play */
    pfs?: RawPathfinderSocietyData;

    /** Character Build Data  */
    build?: Build;

    /** Special strikes which the character can take. */
    actions: CharacterStrike[];
}

// NPCs have an additional 'base' field used for computing the modifiers.
/** Normal armor class data, but with an additional 'base' value. */
export type NPCArmorClassData = ArmorClassData & { base?: number; };
/** Normal save data, but with an additional 'base' value. */
export type NPCSaveData = SaveData & { base?: number; };
/** Normal skill data, but with an additional 'base' value. */
export type NPCPerceptionData = PerceptionData & { base?: number; };
/** Normal skill data, but includes a 'base' value and whether the skill should be rendered (visible). */
export type NPCSkillData = SkillData & {
    base?: number;
    visible?: boolean;
    label: string;
    expanded: string;
};

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

    /** The three saves for NPCs. NPC saves have a 'base' score which is the score before applying custom modifiers. */
    saves: {
        fortitude: NPCSaveData;
        reflex: NPCSaveData;
        will: NPCSaveData;
    }

    /** Details about this actor, such as alignment or ancestry. */
    details: {
        /** The alignment this creature has. */
        alignment: { value: string; };
        /** The race of this creature. */
        ancestry: { value: string; };
        /** The creature level for this actor, and the minimum level (irrelevant for NPCs). */
        level: { value: number; min: number; }
        /** Which sourcebook this creature comes from. */
        source: { value: string; }
        /** The Archive of Nethys URL for this creature. */
        nethysUrl: string;
        /** Information about what is needed to recall knowledge about this creature. */
        recallKnowledgeText: string;
        /** Information which shows up on the sidebar of the creature. */
        sidebarText: string;
        /** The type of this creature (such as 'undead') */
        creatureType: string;
        /** Flavor / descriptive background text for this creature. */
        flavorText: string;
    }

    /** Any special attributes for this NPC, such as AC or health. */
    attributes: {
        /** The armor class of this NPC. */
        ac: NPCArmorClassData;
        /** The perception score for this NPC. */
        perception: NPCPerceptionData;

        /** Dexterity modifier cap to AC. Undefined means no limit. */
        dexCap?: DexterityModifierCapData[];

        /** The hit points for this actor. */
        hp: {
            /** The current number of hitpoints. */
            value: number;
            /** The minimum number of hitpoints (almost always 0). */
            min: number;
            /** The maximum number of hitpoints. */
            max: number;
            /** The current number of temporary hitpoints (if any). */
            temp?: number;
            /** The maximum number of temporary hitpoints (if any). */
            tempmax?: number;
            /** Any special details about this actor health (such as regeneration, etc.). */
            details?: string;
        }

        /** The movement speeds that this NPC has. */
        speed: {
            /** The land speed for this actor. */
            value: string;
            /** @deprecated Special movement speeds. */
            special: string;
            /** A list of other movement speeds the actor possesses. */
            otherSpeeds: LabeledValue[];
        }

        /** Textual information about any special benefits that apply to all saves. */
        allSaves: { value: string; }
    }

    /** Traits, languages, and other information. */
    traits: {
        /** The size of this creature. */
        size: { value: string; }
        /** Special senses this creature possesses. */
        senses: { value: string; }
        /** Traits that define this creature, like 'humanoid' or 'celestial.' */
        traits: { value: string[]; custom: string; }
        /** The rarity of this creature (common, uncommon, etc.) */
        rarity: { value: string; }
        /** Languages this creature knows. */
        languages: { value: string[]; selected: string[]; custom: string; }
        /** Damage/condition immunities. */
        di: { value: string[]; custom: string; }
        /** Damage resistances. */
        dr: LabeledValue[];
        /** Damage vulnerabilities. */
        dv: LabeledValue[];
    }

    /** Skills that this actor possesses; skills the actor is actually trained on are marked 'visible'. */
    skills: Record<string, NPCSkillData>;

    /** Maps roll types -> a list of modifiers which should affect that roll type. */
    customModifiers: Record<string, PF2Modifier[]>;
    /** Maps damage roll types -> a list of damage dice which should be added to that damage roll type. */
    damageDice: Record<string, PF2DamageDice[]>;
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

/** The raw information contained within the actor data object for familiar actors. */
export interface RawFamiliarData {
    /** Maps roll types -> a list of modifiers which should affect that roll type. */
    customModifiers: Record<string, PF2Modifier[]>;
    /** Maps damage roll types -> a list of damage dice which should be added to that damage roll type. */
    damageDice: Record<string, PF2DamageDice[]>;

    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

/** The raw information contained within the actor data object for vehicle actors. */
export interface RawVehicleData {
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

export interface FamiliarData extends ActorEntityData<RawFamiliarData> {
    type: 'familiar';
    master: { id?: string, name?: string, level?: number };
}

/** Wrapper type for vehicle-specific data. */
export interface VehicleData extends ActorEntityData<RawVehicleData> {
    type: 'vehicle';
}

export type ActorData = CharacterData | NpcData | HazardData | LootData | FamiliarData | VehicleData;
