import { CraftingEntryData } from "@actor/character/crafting/entry.ts";
import { CraftingFormulaData } from "@actor/character/crafting/formula.ts";
import {
    AbilityData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureDetailsSource,
    CreatureResources,
    CreatureSystemData,
    CreatureSystemSource,
    CreatureTraitsData,
    HeldShieldData,
    SaveData,
    SkillAbbreviation,
    SkillData,
} from "@actor/creature/data.ts";
import {
    Alignment,
    CreatureInitiativeSource,
    CreatureSpeeds,
    CreatureTraitsSource,
    SenseData,
} from "@actor/creature/index.ts";
import type { CreatureSensePF2e } from "@actor/creature/sense.ts";
import {
    ActorAttributesSource,
    ActorFlagsPF2e,
    AttributeBasedTraceData,
    HitPointsStatistic,
    InitiativeData,
    PerceptionData,
    StrikeData,
    TraitViewData,
} from "@actor/data/base.ts";
import { AttributeString, MovementType, SaveType } from "@actor/types.ts";
import type { WeaponPF2e } from "@item";
import { ArmorCategory } from "@item/armor/types.ts";
import { ProficiencyRank } from "@item/base/data/index.ts";
import { DeitySystemData } from "@item/deity/data.ts";
import { DeityDomain } from "@item/deity/types.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { BaseWeaponType, WeaponCategory, WeaponGroup } from "@item/weapon/types.ts";
import { ValueAndMax, ZeroToFour } from "@module/data.ts";
import { DamageType } from "@system/damage/types.ts";
import type { PredicatePF2e } from "@system/predication.ts";
import type { ArmorClassTraceData, StatisticTraceData } from "@system/statistic/index.ts";
import type { CharacterPF2e } from "./document.ts";
import { WeaponAuxiliaryAction } from "./helpers.ts";
import { CharacterSheetTabVisibility } from "./sheet.ts";

type CharacterSource = BaseCreatureSource<"character", CharacterSystemSource> & {
    flags: DeepPartial<CharacterFlags>;
};

type CharacterFlags = ActorFlagsPF2e & {
    pf2e: {
        /** If applicable, the character's proficiency rank in their deity's favored weapon */
        favoredWeaponRank: number;
        /** The highest number of damage dice among the character's equipped weapons and available unarmed attacks */
        highestWeaponDamageDice: number;
        /** Whether items are crafted without consuming resources */
        freeCrafting: boolean;
        /** Whether the alchemist's (and related dedications) Quick Alchemy ability is enabled */
        quickAlchemy: boolean;
        /** Whether ABP should be disabled despite it being on for the world */
        disableABP?: boolean;
        /** Which sheet tabs are displayed */
        sheetTabs: CharacterSheetTabVisibility;
        /** Whether the basic unarmed attack is shown on the Actions tab */
        showBasicUnarmed: boolean;
    };
};

interface CharacterSystemSource extends CreatureSystemSource {
    abilities?: Record<AttributeString, { mod: number }>;
    attributes: CharacterAttributesSource;
    details: CharacterDetailsSource;
    traits: CharacterTraitsSource;
    build?: CharacterBuildSource;
    saves?: Record<SaveType, { rank: number } | undefined>;
    proficiencies?: {
        attacks?: Record<string, MartialProficiencySource | undefined>;
        defenses?: Record<string, MartialProficiencySource | undefined>;
    };
    resources: CharacterResourcesSource;
    crafting?: { formulas: CraftingFormulaData[] };

    /** Pathfinder Society Organized Play */
    pfs: PathfinderSocietyData;
}

interface MartialProficiencySource {
    rank: ZeroToFour;
    custom?: boolean;
}

interface CharacterAttributesSource extends Omit<ActorAttributesSource, "perception"> {
    hp: {
        value: number;
        temp: number;
        /** Stamina points: present if Stamina variant is enabled  */
        sp?: { value: number };
    };
    speed: {
        value: number;
        otherSpeeds: {
            type: Exclude<MovementType, "land">;
            value: number;
        }[];
    };
    initiative: CreatureInitiativeSource;
}

interface CharacterTraitsSource extends Omit<CreatureTraitsSource, "rarity" | "size"> {
    senses?: SenseData[];
}

interface CharacterDetailsSource extends CreatureDetailsSource {
    alignment: { value: Alignment };
    level: { value: number };
    /** The key ability which class saves (and other class-related things) scale off of. */
    keyability: { value: AttributeString };

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
    biography: CharacterBiography;

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
}

interface CharacterBiography {
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
    /** Character organizations (user-provided field). value is HTML */
    organizations: string;
    /** Visibility (to users with limited ownership of the PC) toggle states */
    visibility: {
        appearance: boolean;
        backstory: boolean;
        personality: boolean;
        campaign: boolean;
    };
}

interface CharacterBuildSource {
    attributes?: AttributeBoostsSource;
}

interface AttributeBoostsSource {
    /** Whether this PC's ability scores are being manually entered (aka custom) */
    manual: boolean;

    boosts: {
        1?: AttributeString[];
        5?: AttributeString[];
        10?: AttributeString[];
        15?: AttributeString[];
        20?: AttributeString[];
    };

    /** Attribute Apex increase from Automatic Bonus Progression */
    apex?: AttributeString | null;
}

interface CharacterResourcesSource {
    heroPoints: ValueAndMax;
    focus?: { value: number; max?: never };
    crafting?: { infusedReagents?: { value: number } };
    /** Used in the variant stamina rules; a resource expended to regain stamina/hp. */
    resolve?: { value: number };
}

/** The raw information contained within the actor data object for characters. */
interface CharacterSystemData extends Omit<CharacterSystemSource, "customModifiers" | "resources">, CreatureSystemData {
    /** The six primary attribute scores. */
    abilities: CharacterAbilities;

    /** Character build data, currently containing attribute boosts and flaws */
    build: CharacterBuildData;

    /** The three save types. */
    saves: CharacterSaves;

    /** Various details about the character, such as level, experience, etc. */
    details: CharacterDetails;

    attributes: CharacterAttributes;

    /** A catch-all for character proficiencies */
    proficiencies: {
        /** Proficiencies in the four weapon categories as well as groups, base weapon types, etc. */
        attacks: Record<WeaponCategory, MartialProficiency> & Record<string, MartialProficiency | undefined>;
        /** Proficiencies in the four armor categories as well as groups, base armor types, etc. */
        defenses: Record<ArmorCategory, MartialProficiency> & Record<string, MartialProficiency | undefined>;
        /** Zero or more class DCs, used for saves related to class abilities. */
        classDCs: Record<string, ClassDCData>;
        /** Spellcasting attack modifiers and DCs for each magical tradition */
        traditions: MagicTraditionProficiencies;
        /** Aliased path components for use by rule element during property injection */
        aliases?: Record<string, string | undefined>;
    };

    /** Player skills, used for various skill checks. */
    skills: Record<SkillAbbreviation, CharacterSkillData>;

    traits: CharacterTraitsData;

    /** Special strikes which the character can take. */
    actions: CharacterStrike[];

    resources: CharacterResources;

    /** Crafting-related data, including known formulas */
    crafting: {
        formulas: CraftingFormulaData[];
        entries: Record<string, Partial<CraftingEntryData>>;
    };

    exploration: string[];
}

interface CharacterSkillData extends SkillData {
    ability: AttributeString;
    /** The proficiency rank ("TEML") */
    rank: ZeroToFour;
    /** Whether this skill is subject to an armor check penalty */
    armor: boolean;
    /** Is this skill a Lore skill? */
    lore?: boolean;
    /** If this is a lore skill, what item it came from */
    itemID?: string;
}

interface CharacterAbilityData extends AbilityData {
    /** An ability score prior to modification by items */
    base: number;
}

interface CharacterBuildData {
    attributes: AttributeBoosts;
}

/**
 * Prepared system data for character ability scores. This is injected by ABC classes to complete it.
 */
interface AttributeBoosts extends AttributeBoostsSource {
    /** Key ability score options drawn from class and class features */
    keyOptions: AttributeString[];

    boosts: Required<AttributeBoostsSource["boosts"]> & {
        ancestry: AttributeString[];
        background: AttributeString[];
        class: AttributeString | null;
    };

    /** Number of remaining allowed boosts (UI and gradual ability boosts only) */
    allowedBoosts: {
        1: number;
        5: number;
        10: number;
        15: number;
        20: number;
    };

    flaws: {
        ancestry: AttributeString[];
    };

    apex: AttributeString | null;
}

type CharacterAbilities = Record<AttributeString, CharacterAbilityData>;

interface CharacterSaveData extends SaveData {
    /** The proficiency rank ("TEML") */
    rank: ZeroToFour;
}
type CharacterSaves = Record<SaveType, CharacterSaveData>;

interface CharacterProficiency {
    label?: string;
    /** The actual modifier for this martial type. */
    value: number;
    /** Describes how the value was computed. */
    breakdown: string;
    /** The proficiency rank (0 untrained - 4 legendary). */
    rank: ZeroToFour;
    /** Can this proficiency be edited or deleted? */
    immutable?: boolean;
}

/** A proficiency with a rank that depends on another proficiency */
interface MartialProficiency extends CharacterProficiency {
    label: string;
    /** A predicate to match against weapons and unarmed attacks */
    definition?: PredicatePF2e;
    /** The category to which this proficiency is linked */
    sameAs?: WeaponCategory | ArmorCategory;
    /** The maximum rank this proficiency can reach */
    maxRank?: Exclude<ProficiencyRank, "untrained">;
    /** Whether the proficiency was manually added by the user */
    custom?: boolean;
}

type MagicTraditionProficiencies = Record<MagicTradition, CharacterProficiency>;
type CategoryProficiencies = Record<ArmorCategory | WeaponCategory, CharacterProficiency>;

type BaseWeaponProficiencyKey = `weapon-base-${BaseWeaponType}`;

type WeaponGroupProficiencyKey = `weapon-group-${WeaponGroup}`;

/** The full data for the class DC; similar to SkillData, but is not rollable. */
interface ClassDCData extends Required<AttributeBasedTraceData>, StatisticTraceData {
    label: string;
    rank: ZeroToFour;
    primary: boolean;
}

/** The full data for a character strike */
interface CharacterStrike extends StrikeData {
    item: WeaponPF2e<CharacterPF2e>;
    /** Whether this attack is visible on the sheet */
    visible: boolean;
    /** Domains/selectors from which modifiers are drawn */
    domains: string[];
    /** Whether the character has sufficient hands available to wield this weapon or use this unarmed attack */
    handsAvailable: boolean;
    altUsages: CharacterStrike[];
    auxiliaryActions: WeaponAuxiliaryAction[];
    weaponTraits: TraitViewData[];
    versatileOptions: VersatileWeaponOption[];
}

interface VersatileWeaponOption {
    value: DamageType;
    selected: boolean;
    label: string;
    glyph: string | null;
}

/** A Pathfinder Society Faction */
type PFSFaction = "EA" | "GA" | "HH" | "VS" | "RO" | "VW";

/** A Pathfinder Society School */
type PFSSchool = "scrolls" | "spells" | "swords" | null;

/** PFS faction reputation values */
type PathfinderSocietyReputation = Record<PFSFaction, number | null>;

/** Pathfinder Society Organized Play data fields */
interface PathfinderSocietyData {
    /** Number assigned to the player. */
    playerNumber: number | null;
    /** Number assigned to the character. */
    characterNumber: number | null;
    /** Is the character currently affected by a level bump? */
    levelBump: boolean;
    /** Character's currently slotted faction */
    currentFaction: PFSFaction;

    /** Character's Pathfinder school */
    school: PFSSchool;

    /** Character's Reputation with all the factions */
    reputation: PathfinderSocietyReputation;
}

interface CharacterResources extends CreatureResources {
    /** The current and maximum number of hero points */
    heroPoints: ValueAndMax;
    /** The current and maximum number of invested items */
    investiture: ValueAndMax;
    crafting: { infusedReagents: ValueAndMax };
    resolve?: ValueAndMax;
}

interface CharacterPerception extends PerceptionData {
    rank: ZeroToFour;
}

interface CharacterDetails extends Omit<CharacterDetailsSource, "alliance">, CreatureDetails {
    /** Convenience information for easy access when the item class instance isn't available */
    ancestry: {
        name: string;
        trait: string;
        /** An "adopted" ancestry (typically gained through the Adopted Ancestry feat) */
        adopted: string | null;
        /** A versatile ancestry trait (such as "orc" for being a half-orc) */
        versatile: string | null;
        /** All ancestries and versatile heritages the character "counts as" when selecting ancestry feats */
        countsAs: string[];
    } | null;
    heritage: { name: string; trait: string | null } | null;
    class: { name: string; trait: string } | null;
    deities: CharacterDeities;
}

interface CharacterDeities {
    primary: DeityDetails | null;
    secondary: null;
    domains: { [K in DeityDomain]?: string };
}

type DeityDetails = Pick<DeitySystemData, "alignment" | "skill"> & {
    weapons: BaseWeaponType[];
};

interface CharacterAttributes extends Omit<CharacterAttributesSource, AttributesSourceOmission>, CreatureAttributes {
    /** The perception statistic */
    perception: CharacterPerception;
    /** Used for saves related to class abilities */
    classDC: ClassDCData | null;
    /** The best spell DC, used for certain saves related to feats */
    spellDC: { rank: number; value: number } | null;
    /** The higher between highest spellcasting DC and (if present) class DC */
    classOrSpellDC: { rank: number; value: number };
    /** Creature armor class, used to defend against attacks. */
    ac: ArmorClassTraceData;
    /** Initiative, used to determine turn order in combat. */
    initiative: InitiativeData;
    /** The amount of HP provided per level by the character's class. */
    classhp: number;
    /** The amount of HP provided at level 1 by the character's ancestry. */
    ancestryhp: number;
    /** The number of hands this character has free */
    handsFree: number;

    /** The number of familiar abilities this character's familiar has access to. */
    familiarAbilities: { value: number };

    /** Data related to character hitpoints. */
    hp: CharacterHitPoints;

    speed: CreatureSpeeds;

    /**
     * Data related to the currently equipped shield. This is copied from the shield data itself and exists to
     * allow for the shield health to be shown on an actor shield and token.
     */
    shield: HeldShieldData;

    /** Whether this actor is under a polymorph effect */
    polymorphed: boolean;

    /** Whether this actor is under a battle form polymorph effect */
    battleForm: boolean;
}
type AttributesSourceOmission = "immunities" | "weaknesses" | "resistances";

interface CharacterHitPoints extends HitPointsStatistic {
    recoveryMultiplier: number;
    recoveryAddend: number;
    sp?: ValueAndMax;
}

interface CharacterTraitsData extends CreatureTraitsData, Omit<CharacterTraitsSource, "size" | "value"> {
    senses: CreatureSensePF2e[];
}

export type {
    BaseWeaponProficiencyKey,
    CategoryProficiencies,
    CharacterAbilities,
    CharacterAttributes,
    CharacterAttributesSource,
    CharacterBiography,
    CharacterDetails,
    CharacterDetailsSource,
    CharacterFlags,
    CharacterProficiency,
    CharacterResources,
    CharacterResourcesSource,
    CharacterSaveData,
    CharacterSaves,
    CharacterSkillData,
    CharacterSource,
    CharacterStrike,
    CharacterSystemData,
    CharacterSystemSource,
    CharacterTraitsData,
    CharacterTraitsSource,
    ClassDCData,
    MagicTraditionProficiencies,
    MartialProficiency,
    WeaponGroupProficiencyKey,
};
