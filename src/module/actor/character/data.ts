import type { CraftingAbilityData, CraftingFormulaData } from "@actor/character/crafting/index.ts";
import {
    AbilityData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureDetailsSource,
    CreatureLanguagesData,
    CreaturePerceptionData,
    CreatureResources,
    CreatureSystemData,
    CreatureSystemSource,
    HeldShieldData,
    SaveData,
    SkillData,
} from "@actor/creature/data.ts";
import { CreatureInitiativeSource, CreatureSpeeds, Language } from "@actor/creature/index.ts";
import {
    ActorAttributesSource,
    ActorFlagsPF2e,
    AttributeBasedTraceData,
    HitPointsStatistic,
    InitiativeData,
    StrikeData,
    TraitViewData,
} from "@actor/data/base.ts";
import { AttributeString, MovementType, SaveType, SkillSlug } from "@actor/types.ts";
import type { WeaponPF2e } from "@item";
import { ArmorCategory } from "@item/armor/types.ts";
import { ProficiencyRank } from "@item/base/data/index.ts";
import { DeitySystemData } from "@item/deity/data.ts";
import { DeityDomain } from "@item/deity/types.ts";
import { BaseWeaponType, WeaponCategory, WeaponGroup } from "@item/weapon/types.ts";
import { ValueAndMax, ZeroToFour } from "@module/data.ts";
import { DamageType } from "@system/damage/types.ts";
import type { Predicate } from "@system/predication.ts";
import type { CharacterPF2e } from "./document.ts";
import type { WeaponAuxiliaryAction } from "./helpers.ts";
import type { CharacterSheetTabVisibility } from "./sheet.ts";

type CharacterSource = BaseCreatureSource<"character", CharacterSystemSource> & {
    flags: DeepPartial<CharacterFlags>;
};

type CharacterFlags = ActorFlagsPF2e & {
    pf2e: {
        /** Has daily preparation crafting been completed for the day */
        dailyCraftingComplete?: boolean;
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
        /** The limit for each feat group that supports a custom limit. */
        featLimits: Record<string, number>;
        /** Whether this actor is under a polymorph effect */
        polymorphed?: boolean;
        /** Whether this actor is under a battle form polymorph effect */
        battleForm?: boolean;
    };
};

interface CharacterSystemSource extends CreatureSystemSource {
    abilities: Record<AttributeString, { mod: number }> | null;
    attributes: CharacterAttributesSource;
    details: CharacterDetailsSource;
    build?: CharacterBuildSource;
    proficiencies?: {
        attacks?: Record<string, MartialProficiencySource | undefined>;
    };
    skills: Partial<Record<SkillSlug, { rank: ZeroToFour }>>;
    resources: CharacterResourcesSource;
    initiative: CreatureInitiativeSource;
    crafting?: { formulas: CraftingFormulaData[] };

    /** Pathfinder Society Organized Play */
    pfs: PathfinderSocietyData;

    perception?: never;
    saves?: never;
    traits?: never;
}

interface MartialProficiencySource {
    rank: ZeroToFour;
    custom?: boolean;
}

interface CharacterAttributesSource extends ActorAttributesSource {
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
}

interface CharacterDetailsSource extends CreatureDetailsSource {
    level: { value: number };
    languages: CreatureLanguagesData;
    /** The key ability which class saves (and other class-related things) scale off of. */
    keyability: { value: AttributeString };

    /** How old the character is */
    age: { value: string };
    /** Character height */
    height: { value: string };
    /** Character weight */
    weight: { value: string };
    /** Character gender/pronouns */
    gender: { value: string };
    /** Character ethnicity */
    ethnicity: { value: string };
    nationality: { value: string };
    /** User-provided biography for their character */
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
    /** HTML value */
    appearance: string;
    /** HTML value */
    backstory: string;
    birthPlace: string;
    attitude: string;
    beliefs: string;
    edicts: string[];
    anathema: string[];
    likes: string;
    dislikes: string;
    catchphrases: string;
    /** HTML value */
    campaignNotes: string;
    /** HTML value */
    allies: string;
    /** HTML value */
    enemies: string;
    /** HTML value */
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

/** The raw information contained within the actor data object for characters. */
interface CharacterSystemData extends Omit<CharacterSystemSource, SourceOmission>, CreatureSystemData {
    /** The six primary attribute scores. */
    abilities: CharacterAbilities;

    /** Character build data, currently containing attribute boosts and flaws */
    build: CharacterBuildData;

    /** The three save types. */
    saves: CharacterSaves;

    /** Various details about the character, such as level, experience, etc. */
    details: CharacterDetails;

    attributes: CharacterAttributes;

    perception: CharacterPerceptionData;

    initiative: InitiativeData;

    /** A catch-all for character proficiencies */
    proficiencies: {
        /** Proficiencies in the four weapon categories as well as groups, base weapon types, etc. */
        attacks: Record<string, MartialProficiency>;
        /** Proficiencies in the four armor categories as well as groups, base armor types, etc. */
        defenses: Record<string, MartialProficiency>;
        /** Zero or more class DCs, used for saves related to class abilities. */
        classDCs: Record<string, ClassDCData>;
        /** Spellcasting attack modifier and dc for all spellcasting */
        spellcasting: CharacterProficiency;
        /** Aliased path components for use by rule element during property injection */
        aliases?: Record<string, string | undefined>;
    };

    /** Player skills, used for various skill checks. */
    skills: Record<string, CharacterSkillData>;

    /** Special strikes which the character can take. */
    actions: CharacterStrike[];

    resources: CharacterResources;

    /** Crafting-related data, including known formulas */
    crafting: CharacterCraftingData;

    exploration: string[];
}

type SourceOmission = "customModifiers" | "perception" | "resources" | "saves" | "traits";

interface CharacterSkillData extends SkillData {
    attribute: AttributeString;
    /** The proficiency rank ("TEML") */
    rank: ZeroToFour;
    /** Whether this skill is subject to an armor check penalty */
    armor: boolean;
    /** Is this skill a Lore skill? */
    lore?: boolean;
    /** If this is a lore skill, what item it came from */
    itemId: string | null;
}

interface CharacterAbilityData extends AbilityData {
    /** An ability score prior to modification by items */
    base: number;
}

interface CharacterBuildData {
    attributes: AttributeBoosts;
    languages: LanguageBuildData;
}

interface LanguageBuildData extends ValueAndMax {
    /** Specific languages granted by ancestry, feats, etc., that do not count against the character's maximum */
    granted: GrantedLanguage[];
}

/** A language added by some freature (typically ancestry) that doesn't count against the character's maximum */
interface GrantedLanguage {
    slug: Language;
    source: string;
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
}

/** A proficiency with a rank that depends on another proficiency */
interface MartialProficiency extends CharacterProficiency {
    label: string;
    /** A predicate to match against weapons and unarmed attacks */
    definition?: Predicate;
    /** The category to which this proficiency is linked */
    sameAs?: WeaponCategory | ArmorCategory;
    /** The maximum rank this proficiency can reach */
    maxRank?: Exclude<ProficiencyRank, "untrained">;
    /** Whether the proficiency was manually added by the user */
    custom?: boolean;
    /** Whether the proficiency is visible on the character sheet */
    visible: boolean;
}

type CategoryProficiencies = Record<ArmorCategory | WeaponCategory, CharacterProficiency>;

type BaseWeaponProficiencyKey = `weapon-base-${BaseWeaponType}`;

type WeaponGroupProficiencyKey = `weapon-group-${WeaponGroup}`;

/** The full data for the class DC; similar to SkillData, but is not rollable. */
interface ClassDCData extends Required<AttributeBasedTraceData> {
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
    doubleBarrel: { selected: boolean } | null;
    versatileOptions: VersatileWeaponOption[];
}

interface VersatileWeaponOption {
    value: DamageType;
    selected: boolean;
    label: string;
    glyph: string | null;
}

interface CharacterCraftingData {
    formulas: CraftingFormulaData[];
    entries: Record<string, CraftingAbilityData>;
}

type CharacterResources = CreatureResources & {
    /** The current and maximum number of hero points */
    heroPoints: ValueAndMax;
    /** The current number of focus points and pool size */
    focus: ValueAndMax & { cap: number };
    /** The current and maximum number of invested items */
    investiture: ValueAndMax;
    // Will be removed in a future update
    crafting: { infusedReagents: ValueAndMax };
    resolve?: ValueAndMax;
    mythicPoints: ValueAndMax;
};

interface CharacterPerceptionData extends CreaturePerceptionData {
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

interface DeityDetails extends Pick<DeitySystemData, "skill"> {
    weapons: BaseWeaponType[];
}

interface CharacterAttributes extends Omit<CharacterAttributesSource, AttributesSourceOmission>, CreatureAttributes {
    /** Used for saves related to class abilities */
    classDC: ClassDCData | null;
    /** The best spell DC, used for certain saves related to feats */
    spellDC: { rank: number; value: number } | null;
    /** The higher between highest spellcasting DC and (if present) class DC */
    classOrSpellDC: { rank: number; value: number };
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
}
type AttributesSourceOmission = "immunities" | "weaknesses" | "resistances";

interface CharacterHitPoints extends HitPointsStatistic {
    recoveryMultiplier: number;
    recoveryAddend: number;
    sp?: ValueAndMax;
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
    ClassDCData,
    MartialProficiency,
    WeaponGroupProficiencyKey,
};
