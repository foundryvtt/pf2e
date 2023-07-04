import { CraftingEntryData } from "@actor/character/crafting/entry.ts";
import { CraftingFormulaData } from "@actor/character/crafting/formula.ts";
import {
    AbilityData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureHitPoints,
    CreatureResources,
    CreatureSystemData,
    CreatureTraitsData,
    HeldShieldData,
    SaveData,
    SkillAbbreviation,
    SkillData,
} from "@actor/creature/data.ts";
import { CreatureSensePF2e } from "@actor/creature/sense.ts";
import {
    AbilityBasedStatistic,
    ActorFlagsPF2e,
    InitiativeData,
    PerceptionData,
    StrikeData,
    TraitViewData,
} from "@actor/data/base.ts";
import { AbilityString, SaveType } from "@actor/types.ts";
import { FeatPF2e, WeaponPF2e } from "@item";
import { ArmorCategory } from "@item/armor/types.ts";
import { ProficiencyRank } from "@item/data/index.ts";
import { DeitySystemData } from "@item/deity/data.ts";
import { DeityDomain } from "@item/deity/types.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { BaseWeaponType, WeaponCategory, WeaponGroup } from "@item/weapon/types.ts";
import { ValueAndMax, ZeroToFour } from "@module/data.ts";
import { DamageType } from "@system/damage/types.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { ArmorClassTraceData } from "@system/statistic/armor-class.ts";
import { StatisticTraceData } from "@system/statistic/data.ts";
import { CharacterPF2e } from "./document.ts";
import { WeaponAuxiliaryAction } from "./helpers.ts";
import { CharacterSheetTabVisibility } from "./sheet.ts";

interface CharacterSource extends BaseCreatureSource<"character", CharacterSystemData> {
    flags: DeepPartial<CharacterFlags>;
}

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

interface CharacterSkillData extends SkillData {
    ability: AbilityString;
    /** The proficiency rank ("TEML") */
    rank: ZeroToFour;
    /** Whether this skill is subject to an armor check penalty */
    armor: boolean;
    /** Is this skill a Lore skill? */
    lore?: boolean;
    /** If this is a lore skill, what item it came from */
    itemID?: string;
}

/** The raw information contained within the actor data object for characters. */
interface CharacterSystemData extends CreatureSystemData {
    /** The six primary ability scores. */
    abilities: CharacterAbilities;

    /** Character build data, currently containing ability boosts and flaws */
    build: {
        abilities: CharacterBuildingAbilitySystemData;
    };

    /** The three save types. */
    saves: CharacterSaves;

    /** Tracks proficiencies for martial (weapon and armor) skills. */
    martial: MartialProficiencies;

    /** Various details about the character, such as level, experience, etc. */
    details: CharacterDetails;

    attributes: CharacterAttributes;

    /** A catch-all for character proficiencies */
    proficiencies: {
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

    /** Pathfinder Society Organized Play */
    pfs: PathfinderSocietyData;

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

interface CharacterAbilityData extends AbilityData {
    /** An ability score prior to modification by items */
    base: number;
}

interface CharacterBuildingAbilitySourceData {
    /** Whether this PC's ability scores are being manually entered (aka custom) */
    manual: boolean;

    boosts: {
        1: AbilityString[];
        5: AbilityString[];
        10: AbilityString[];
        15: AbilityString[];
        20: AbilityString[];
    };
}

/**
 * Prepared system data for character ability scores. This is injected by ABC classes to complete it.
 */
interface CharacterBuildingAbilitySystemData extends CharacterBuildingAbilitySourceData {
    /** Key ability score options drawn from class and class features */
    keyOptions: AbilityString[];

    boosts: CharacterBuildingAbilitySourceData["boosts"] & {
        ancestry: AbilityString[];
        background: AbilityString[];
        class: AbilityString | null;
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
        ancestry: AbilityString[];
    };
}

type CharacterAbilities = Record<AbilityString, CharacterAbilityData>;

interface CharacterSaveData extends SaveData {
    ability: AbilityString;
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
    /** A proficiency in a non-armor/weapon category and not added by a feat or feature */
    custom?: boolean;
}

/** A proficiency with a rank that depends on another proficiency */
interface MartialProficiency extends Omit<CharacterProficiency, "custom"> {
    /** A predicate to match against weapons and unarmed attacks */
    definition: PredicatePF2e;
    /** The category to which this proficiency is linked */
    sameAs?: WeaponCategory;
    /** The maximum rank this proficiency can reach */
    maxRank?: Exclude<ProficiencyRank, "untrained">;
}

interface LinkedProficiency extends MartialProficiency {
    sameAs: WeaponCategory;
}

type MagicTraditionProficiencies = Record<MagicTradition, CharacterProficiency>;
type CategoryProficiencies = Record<ArmorCategory | WeaponCategory, CharacterProficiency>;

type BaseWeaponProficiencyKey = `weapon-base-${BaseWeaponType}`;
type BaseWeaponProficiencies = Record<BaseWeaponProficiencyKey, CharacterProficiency>;

type WeaponGroupProficiencyKey = `weapon-group-${WeaponGroup}`;
type WeaponGroupProfiencies = Record<WeaponGroupProficiencyKey, CharacterProficiency>;

type LinkedProficiencies = Record<string, MartialProficiency>;

type MartialProficiencies = CategoryProficiencies &
    BaseWeaponProficiencies &
    WeaponGroupProfiencies &
    LinkedProficiencies;

type MartialProficiencyKey = keyof Required<MartialProficiencies>;

/** The full data for the class DC; similar to SkillData, but is not rollable. */
interface ClassDCData extends Required<AbilityBasedStatistic>, StatisticTraceData {
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
}

interface CharacterPerception extends PerceptionData {
    rank: ZeroToFour;
}

type CharacterDetails = Omit<CreatureDetails, "creature"> & {
    /** The key ability which class saves (and other class-related things) scale off of. */
    keyability: { value: AbilityString };

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

    /** Convenience information for easy access when the item class instance isn't available */
    ancestry: {
        name: string;
        trait: string;
        /** All ancestries and versatile heritages the character "counts as" when selecting ancestry feats */
        countsAs: string[];
    } | null;
    heritage: { name: string; trait: string | null } | null;
    class: { name: string; trait: string } | null;
    deities: CharacterDeities;
};

interface CharacterDeities {
    primary: DeityDetails | null;
    secondary: null;
    domains: { [K in DeityDomain]?: string };
}

type DeityDetails = Pick<DeitySystemData, "alignment" | "skill"> & {
    weapons: BaseWeaponType[];
};

interface CharacterAttributes extends CreatureAttributes {
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
    /** A bonus to the maximum amount of bulk that this character can carry. */
    bonusLimitBulk: number;
    /** A bonus to the maximum amount of bulk that this character can carry without being encumbered. */
    bonusEncumbranceBulk: number;

    /** The number of familiar abilities this character's familiar has access to. */
    familiarAbilities: { value: number };

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
     * Data related to the currently equipped shield. This is copied from the shield data itself and exists to
     * allow for the shield health to be shown on an actor shield and token.
     */
    shield: HeldShieldData;

    /** Used in the variant stamina rules; a resource expended to regain stamina/hp. */
    resolve: { value: number; max: number };

    /** Whether this actor is under a polymorph effect */
    polymorphed: boolean;

    /** Whether this actor is under a battle form polymorph effect */
    battleForm: boolean;
}

interface CharacterHitPoints extends CreatureHitPoints {
    recoveryMultiplier: number;
    recoveryAddend: number;
}

interface CharacterTraitsData extends CreatureTraitsData {
    senses: CreatureSensePF2e[];
}

interface SlottedFeat {
    id: string;
    level: number | string;
    feat?: FeatPF2e;
}

interface BonusFeat {
    feat: FeatPF2e;
}

export {
    BaseWeaponProficiencyKey,
    BonusFeat,
    CategoryProficiencies,
    CharacterAttributes,
    CharacterDetails,
    CharacterFlags,
    CharacterProficiency,
    CharacterResources,
    CharacterSaveData,
    CharacterSaves,
    CharacterSkillData,
    CharacterSource,
    CharacterStrike,
    CharacterSystemData,
    CharacterTraitsData,
    ClassDCData,
    LinkedProficiency,
    MagicTraditionProficiencies,
    MartialProficiencies,
    MartialProficiency,
    MartialProficiencyKey,
    SlottedFeat,
    WeaponGroupProficiencyKey,
};
