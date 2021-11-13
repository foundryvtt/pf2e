import {
    Abilities,
    Alignment,
    CreatureAttributes,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureHitPoints,
    CreatureSystemData,
    SaveData,
    SkillAbbreviation,
    SkillData,
    CreatureInitiative,
} from "@actor/creature/data";
import {
    AbilityString,
    ActorFlagsPF2e,
    ArmorClassData,
    DexterityModifierCapData,
    PerceptionData,
    RawStatistic,
    AbilityBasedStatistic,
    RollToggle,
    StrikeData,
} from "@actor/data/base";
import { ArmorCategory } from "@item/armor/data";
import { BaseWeaponType, WeaponCategory, WeaponGroup } from "@item/weapon/data";
import { StatisticModifier } from "@module/modifiers";
import { ZeroToFour } from "@module/data";
import type { CharacterPF2e } from "..";
import { SaveType } from "@actor/data";
import { MagicTradition } from "@item/spellcasting-entry/data";
import { CraftingFormulaData } from "@module/crafting/formula";
import { DegreeOfSuccessAdjustment } from "@system/check-degree-of-success";
import { CraftingEntryData } from "@module/crafting/crafting-entry";
import { PredicatePF2e } from "@system/predication";
import { ProficiencyRank } from "@item/data";
import { InventoryWeight } from "@item/physical/encumbrance";

export interface CharacterSource extends BaseCreatureSource<"character", CharacterSystemData> {
    flags: DeepPartial<CharacterFlags>;
}

export class CharacterData extends BaseCreatureData<CharacterPF2e, CharacterSystemData> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/mystery-man.svg";
}

export interface CharacterData extends Omit<CharacterSource, "effects" | "flags" | "items" | "token"> {
    readonly type: CharacterSource["type"];
    data: CharacterSystemData;
    flags: CharacterFlags;
    readonly _source: CharacterSource;
}

type CharacterFlags = ActorFlagsPF2e & {
    pf2e: {
        freeCrafting: boolean;
        disableABP?: boolean;
    };
};

export interface CharacterSkillData extends SkillData {
    ability: AbilityString;
    /** The proficiency rank ("TEML") */
    rank: ZeroToFour;
    /** Whether this skill is subject to an armor check penalty */
    armor: boolean;
}

/** The raw information contained within the actor data object for characters. */
export interface CharacterSystemData extends CreatureSystemData {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** The three save types. */
    saves: CharacterSaves;

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
        biography: {
            /** Character appearance (user-provided field). value is HTML */
            appearance: string;
            /** Character Backstory (user-provided field). value is HTML */
            backstory: string;
            /** Character birthPlace (user-provided field). */
            birthPlace: string;
            /** Character attitude (user-provided field). */
            attitude: string;
            /** Character beliefs (user-provided field). */
            beliefs: string;
            /** Character likes (user-provided field). */
            likes: string;
            /** Character dislikes (user-provided field). */
            dislikes: string;
            /** Character catchphrases (user-provided field). */
            catchphrases: string;
            /** Campaign notes (user-provided field). value is HTML */
            campaignNotes: string;
            /** Character allies (user-provided field). value is HTML */
            allies: string;
            /** Character enemies (user-provided field). value is HTML */
            enemies: string;
            /** Character organaizations (user-provided field). value is HTML */
            organaizations: string;
        };

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

    /** A catch-all for character proficiencies */
    proficiencies: {
        traditions: MagicTraditionProficiencies;
        /** Aliased path components for use by rule element during property injection */
        aliases?: Record<string, string | undefined>;
    };

    /** Player skills, used for various skill checks. */
    skills: { [K in SkillAbbreviation]: CharacterSkillData };

    /** Pathfinder Society Organized Play */
    pfs: PathfinderSocietyData;

    /** Special strikes which the character can take. */
    actions: CharacterStrike[];

    toggles: {
        actions: RollToggle[];
    };

    resources: CharacterResources;

    /** Crafting-related data, including known formulas */
    crafting: {
        formulas: CraftingFormulaData[];
        entries: Record<string, CraftingEntryData>;
    };
}

interface CharacterSaveData extends SaveData {
    ability: AbilityString;
    /** The proficiency rank ("TEML") */
    rank: ZeroToFour;
}
export type CharacterSaves = Record<SaveType, CharacterSaveData>;

export interface CharacterProficiency extends RawStatistic {
    /** The proficiency rank (0 untrained - 4 legendary). */
    rank: ZeroToFour;
    label?: string;
    /** A proficiency in a non-armor/weapon category and not added by a feat or feature */
    custom?: true;
}

/** A proficiency with a rank that depends on another proficiency */
export interface LinkedProficiency extends Omit<CharacterProficiency, "custom"> {
    /** A predicate to match against weapons */
    predicate: PredicatePF2e;
    /** The category to which this proficiency is linked */
    sameAs: WeaponCategory;
    /** The maximum rank this proficiency can reach */
    maxRank?: Exclude<ProficiencyRank, "untrained">;
}

export type MagicTraditionProficiencies = Record<MagicTradition, CharacterProficiency>;
export type CategoryProficiencies = Record<ArmorCategory | WeaponCategory, CharacterProficiency>;

export type BaseWeaponProficiencyKey = `weapon-base-${BaseWeaponType}`;
type BaseWeaponProficiencies = Record<BaseWeaponProficiencyKey, CharacterProficiency>;

export type WeaponGroupProficiencyKey = `weapon-group-${WeaponGroup}`;
type WeaponGroupProfiencies = Record<WeaponGroupProficiencyKey, CharacterProficiency>;

type LinkedProficiencies = Record<string, LinkedProficiency>;

export type CombatProficiencies = CategoryProficiencies &
    BaseWeaponProficiencies &
    WeaponGroupProfiencies &
    LinkedProficiencies;

export type CombatProficiencyKey = keyof Required<CombatProficiencies>;

/** The full data for the class DC; similar to SkillData, but is not rollable. */
export interface ClassDCData extends StatisticModifier, AbilityBasedStatistic {
    rank: ZeroToFour;
}

/** The full data for a character action (used primarily for strikes.) */
export type CharacterStrike = StatisticModifier &
    StrikeData & {
        slug: string | null;
        adjustments?: DegreeOfSuccessAdjustment[];
        meleeUsage: CharacterStrike | null;
    };

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

interface CharacterResources {
    /** The current number of focus points and pool size */
    focus: { value: number; max: number };
    /** The current and maximum number of hero points */
    heroPoints: { value: number; max: number };
    /** The current and maximum number of invested items */
    investiture: { value: number; max: number };
    crafting: {
        infusedReagents: { value: number; max: number };
    };
}

interface CharacterPerception extends PerceptionData {
    rank: ZeroToFour;
}

export interface CharacterAttributes extends CreatureAttributes {
    /** The perception skill. */
    perception: CharacterPerception;
    /** The class DC, used for saves related to class abilities. */
    classDC: ClassDCData;
    /** Creature armor class, used to defend against attacks. */
    ac: CharacterArmorClass;
    /** Initiative, used to determine turn order in combat. */
    initiative: CreatureInitiative;

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
    /** The encumbrance status of the character */
    encumbrance: InventoryWeight;

    /** The current dying level (and maximum) for this character. */
    dying: { value: number; max: number };
    /** The current wounded level (and maximum) for this character. */
    wounded: { value: number; max: number };
    /** The current doomed level (and maximum) for this character. */
    doomed: { value: number; max: number };

    /** The number of familiar abilities this character's familiar has access to. */
    familiarAbilities: { value: number };

    /** The character's natural reach */
    reach: {
        value: number;
        /** Its reach for the purpose of manipulate actions */
        manipulate: number | null;
    };

    /** Data related to character hitpoints. */
    hp: CharacterHitPoints;

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

    /** Used in the variant stamina rules; a resource expended to regain stamina/hp. */
    resolve: { value: number; max: number };
}

interface CharacterHitPoints extends CreatureHitPoints {
    recoveryMultiplier: number;
}
