import {
    Abilities,
    Alignment,
    BaseCreatureAttributes,
    BaseCreatureData,
    BaseCreatureResources,
    BaseCreatureSource,
    CreatureSystemData,
    SaveData,
    SkillAbbreviation,
    SkillData,
} from "@actor/creature/data";
import {
    AbilityString,
    ActorFlagsPF2e,
    ArmorClassData,
    DexterityModifierCapData,
    HitPointsData,
    PerceptionData,
    ProficiencyData,
    RawSkillData,
    RollToggle,
    StrikeData,
} from "@actor/data/base";
import { ArmorCategory } from "@item/armor/data";
import { BaseWeaponType, WeaponCategory, WeaponGroup, WeaponTrait } from "@item/weapon/data";
import { CheckModifier, StatisticModifier } from "@module/modifiers";
import { LabeledValue, ZeroToFour, ZeroToThree } from "@module/data";
import type { CharacterPF2e } from ".";
import { SaveType } from "@actor/data";
import { MagicTradition } from "@item/spellcasting-entry/data";
import { SENSE_TYPES } from "@actor/data/values";

export type CharacterSource = BaseCreatureSource<"character", CharacterSystemData>;

export class CharacterData extends BaseCreatureData<CharacterPF2e, CharacterSystemData> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/mystery-man.svg";
}

export interface CharacterData extends Omit<CharacterSource, "effects" | "items" | "token"> {
    readonly type: CharacterSource["type"];
    data: CharacterSource["data"];
    flags: ActorFlagsPF2e;
    readonly _source: CharacterSource;
}

export interface CharacterSkillData extends SkillData {
    rank: ZeroToFour;
}

/** The raw information contained within the actor data object for characters. */
export interface CharacterSystemData extends CreatureSystemData {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** The three save types. */
    saves: CharacterSaves;

    /** Tracks proficiencies for magic skills */
    magic: MagicTraditionProficiencies;

    /** Tracks proficiencies for martial (weapon and armor) skills. */
    martial: CombatProficiencies;

    /** Various details about the character, such as level, experience, etc. */
    details: {
        /** The key ability which class saves (and other class-related things) scale off of. */
        keyability: { value: AbilityString };

        /** Character alignment (LN, N, NG, etc.) */
        alignment: { value: Alignment };
        /** Character heritage (what specific kind of race they are, like 'Warmarch Hobgoblin'). */
        heritage: { value: string };
        /** The diety that the character worships (and an image of the diety symbol). */
        deity: { value: string; image: ImagePath };
        /** How old the character is (user-provided field). */
        age: { value: string };
        /** Character height (user-provided field). */
        height: { value: string };
        /** Character weight (user-provided field). */
        weight: { value: string };
        /** Character gender/pronouns (user-provided field). */
        gender: { value: string };
        /** Character ethnicity (user-provided field). */
        ethnicity: { value: string };
        /** Character nationality (i.e, what nation they hail from; user-provided field). */
        nationality: { value: string };
        /** User-provided biography for their character; value is HTML. */
        biography: { value: string; public?: string };

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
        };
    };

    attributes: CharacterAttributes;

    /** Player skills, used for various skill checks. */
    skills: Record<SkillAbbreviation, CharacterSkillData>;

    /** Pathfinder Society Organized Play */
    pfs: PathfinderSocietyData;

    /** Special strikes which the character can take. */
    actions: CharacterStrike[];

    toggles: {
        actions: RollToggle[];
    };

    resources: CharacterResources;
}

interface CharacterSaveData extends SaveData {
    rank: ZeroToFour;
}
export type CharacterSaves = Record<SaveType, CharacterSaveData>;

export interface CharacterProficiencyData extends ProficiencyData {
    /** The proficiency rank (0 untrained - 4 legendary). */
    rank: ZeroToFour;
    /** A proficiency in a non-armor/weapon category and not added by a feat or feature */
    custom?: true;
    /** A weapon familiarity from an ancestry feat */
    familiarity?: {
        name: string;
        category: WeaponCategory;
        trait: WeaponTrait;
    };
}

export type MagicTraditionProficiencies = Record<MagicTradition, CharacterProficiencyData>;
export type CategoryProficiencies = Record<ArmorCategory | WeaponCategory, CharacterProficiencyData>;

export type BaseWeaponProficiencyKey = `weapon-base-${BaseWeaponType}`;
type BaseWeaponProficiencies = Record<BaseWeaponProficiencyKey, CharacterProficiencyData>;

export type WeaponGroupProficiencyKey = `weapon-group-${WeaponGroup}`;
type WeaponGroupProfiencies = Record<WeaponGroupProficiencyKey, CharacterProficiencyData>;

export type CombatProficiencies = CategoryProficiencies &
    Partial<BaseWeaponProficiencies> &
    Partial<WeaponGroupProfiencies>;

export type CombatProficiencyKey = keyof Required<CombatProficiencies>;

/** The full data for the class DC; similar to SkillData, but is not rollable. */
export interface ClassDCData extends StatisticModifier, RawSkillData {
    rank: ZeroToFour;
}

/** The full data for a character action (used primarily for strikes.) */
export interface CharacterStrike extends StatisticModifier, StrikeData {
    slug: string | null;
}

/** A Pathfinder Society Faction */
type PFSFaction = "EA" | "GA" | "HH" | "VS" | "RO" | "VW";

/** A Pathfinder Society School */
type PFSSchool = "none" | "scrolls" | "spells" | "swords";

/** PFS faction reputation values */
interface PathfinderSocietyReputation {
    EA: number;
    GA: number;
    HH: number;
    VS: number;
    RO: number;
    VW: number;
}

/** Pathfinder Society Organized Play data fields */
interface PathfinderSocietyData {
    /** Number assigned to the player. */
    playerNumber: string;
    /** Number assigned to the character. */
    characterNumber: string;
    /** Is the character currently affected by a level bump? */
    levelBump: boolean;
    /** Character's current fame */
    fame: number;
    /** Character's currently slotted faction */
    currentFaction: PFSFaction;

    /** Character's Pathfinder school */
    school: PFSSchool;

    /** Character's Reputation with all the factions */
    reputation: PathfinderSocietyReputation;
}

export type CharacterArmorClass = StatisticModifier & Required<ArmorClassData>;

interface CharacterResources extends BaseCreatureResources {
    investiture: {
        value: number;
        max: number;
    };
}

interface CharacterPerception extends PerceptionData {
    rank: ZeroToFour;
}

export interface CharacterAttributes extends BaseCreatureAttributes {
    /** The perception skill. */
    perception: CharacterPerception;
    /** The class DC, used for saves related to class abilities. */
    classDC: ClassDCData;
    /** Creature armor class, used to defend against attacks. */
    ac: CharacterArmorClass;
    /** Initiative, used to determine turn order in combat. */
    initiative: CheckModifier;

    /** Dexterity modifier cap to AC. Undefined means no limit. */
    dexCap: DexterityModifierCapData[];

    /** The amount of bonus HP gained per level (due a feat or similar). */
    levelbonushp: number;
    /** A flat bonus (i.e., not scaling with level) to hit points. */
    flatbonushp: number;
    /** A flat-bonus (i.e., not scaling with level) to stamina points. */
    flatbonussp: number;
    /** Used in variant stamina rules; how much bonus SP is gained per level. */
    levelbonussp?: number;
    /** The amount of HP provided per level by the character's class. */
    classhp: number;
    /** The amount of HP provided at level 1 by the character's ancestry. */
    ancestryhp: number;
    /** A bonus to the maximum amount of bulk that this character can carry. */
    bonusLimitBulk: number;
    /** A bonus to the maximum amount of bulk that this character can carry without being encumbered. */
    bonusEncumbranceBulk: number;

    /** The current dying level (and maximum) for this character. */
    dying: { value: number; max: number };
    /** The current wounded level (and maximum) for this character. */
    wounded: { value: number; max: number };
    /** The current doomed level (and maximum) for this character. */
    doomed: { value: number; max: number };
    /** The current number of hero points (and maximum) for this character. */
    heroPoints: { rank: ZeroToThree; max: number };

    /** The number of familiar abilities this character's familiar has access to. */
    familiarAbilities: StatisticModifier;

    /** The character's natural reach */
    reach: {
        value: number;
        /** Its reach for the purpose of manipulate actions */
        manipulate: number | null;
    };

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
        /** The shield's AC */
        ac: number;
        /** The shield's hardness */
        hardness: number;
        /** The shield's broken threshold */
        brokenThreshold: number;
        /** The current shield health (added in actor preparation) */
        hp: {
            value: number;
        };
    };

    /** Records the various land/swim/fly speeds that this actor has. */
    speed: StatisticModifier & {
        /** The actor's primary speed (usually walking/stride speed). */
        value: string;
        /** Other speeds that this actor can use (such as swim, climb, etc). */
        otherSpeeds: LabeledSpeed[];
        /** The derived value after applying modifiers, bonuses, and penalties */
        total: number;
        /** A textual breakdown of the base speed and any modifiers applied to it */
        breakdown?: string;
    };

    /** Used in the variant stamina rules; a resource expended to regain stamina/hp. */
    resolve: { value: number };
}

export type SenseType = typeof SENSE_TYPES[number];

export type MovementType = "land" | "burrow" | "climb" | "fly" | "swim";
interface LabeledSpeed extends LabeledValue {
    type: Exclude<MovementType, "land">;
    value: string;
    label: string;
}
