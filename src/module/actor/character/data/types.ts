import { CraftingEntryData } from "@actor/character/crafting/entry";
import { CraftingFormulaData } from "@actor/character/crafting/formula";
import {
    Abilities,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureHitPoints,
    CreatureInitiative,
    CreatureSystemData,
    HeldShieldData,
    SaveData,
    SkillAbbreviation,
    SkillData,
} from "@actor/creature/data";
import { SaveType } from "@actor/data";
import {
    AbilityBasedStatistic,
    AbilityString,
    ActorFlagsPF2e,
    ArmorClassData,
    DexterityModifierCapData,
    PerceptionData,
    StrikeData,
} from "@actor/data/base";
import { StatisticModifier } from "@actor/modifiers";
import { FeatPF2e, WeaponPF2e } from "@item";
import { ArmorCategory } from "@item/armor/data";
import { FeatData, ProficiencyRank } from "@item/data";
import { DeitySystemData } from "@item/deity/data";
import { DeityDomain } from "@item/deity/types";
import { FeatType } from "@item/feat/data";
import { MagicTradition } from "@item/spell/types";
import { BaseWeaponType, WeaponCategory, WeaponGroup } from "@item/weapon/types";
import { ZeroToFour } from "@module/data";
import { DegreeOfSuccessAdjustment } from "@system/degree-of-success";
import { PredicatePF2e } from "@system/predication";
import type { CharacterPF2e } from "..";
import { CharacterSheetTabVisibility } from "./sheet";

interface CharacterSource extends BaseCreatureSource<"character", CharacterSystemData> {
    flags: DeepPartial<CharacterFlags>;
}

interface CharacterData
    extends Omit<CharacterSource, "data" | "effects" | "items" | "token" | "type">,
        BaseCreatureData<CharacterPF2e, "character", CharacterSystemData, CharacterSource> {
    flags: CharacterFlags;
}

type CharacterFlags = ActorFlagsPF2e & {
    pf2e: {
        freeCrafting: boolean;
        disableABP?: boolean;
        sheetTabs: CharacterSheetTabVisibility;
    };
};

interface CharacterSkillData extends SkillData {
    ability: AbilityString;
    /** The proficiency rank ("TEML") */
    rank: ZeroToFour;
    /** Whether this skill is subject to an armor check penalty */
    armor: boolean;
}

/** The raw information contained within the actor data object for characters. */
interface CharacterSystemData extends CreatureSystemData {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** The three save types. */
    saves: CharacterSaves;

    /** Tracks proficiencies for martial (weapon and armor) skills. */
    martial: MartialProficiencies;

    /** Various details about the character, such as level, experience, etc. */
    details: CharacterDetails;

    attributes: CharacterAttributes;

    /** A catch-all for character proficiencies */
    proficiencies: {
        traditions: MagicTraditionProficiencies;
        /** Aliased path components for use by rule element during property injection */
        aliases?: Record<string, string | undefined>;
    };

    /** Player skills, used for various skill checks. */
    skills: Record<SkillAbbreviation, CharacterSkillData>;

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
}

interface CharacterSaveData extends SaveData {
    ability: AbilityString;
    /** The proficiency rank ("TEML") */
    rank: ZeroToFour;
}
type CharacterSaves = Record<SaveType, CharacterSaveData>;

interface CharacterProficiency {
    /** The actual modifier for this martial type. */
    value: number;
    /** Describes how the value was computed. */
    breakdown: string;
    /** The proficiency rank (0 untrained - 4 legendary). */
    rank: ZeroToFour;
    label?: string;
    /** A proficiency in a non-armor/weapon category and not added by a feat or feature */
    custom?: true;
}

/** A proficiency with a rank that depends on another proficiency */
interface MartialProficiency extends Omit<CharacterProficiency, "custom"> {
    /** A predicate to match against weapons and unarmed attacks */
    definition: PredicatePF2e;
    /** Can this proficiency be edited or deleted? */
    immutable?: boolean;
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
interface ClassDCData extends StatisticModifier, AbilityBasedStatistic {
    rank: ZeroToFour;
}

/** The full data for a character action (used primarily for strikes.) */
interface CharacterStrike extends StrikeData {
    item: Embedded<WeaponPF2e>;
    slug: string | null;
    adjustments?: DegreeOfSuccessAdjustment[];
    altUsages: CharacterStrike[];
    auxiliaryActions: AuxiliaryAction[];
}

interface AuxiliaryAction {
    label: string;
    img: string;
    execute: () => Promise<void>;
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

type CharacterArmorClass = StatisticModifier & Required<ArmorClassData>;

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

type CharacterDetails = CreatureDetails & {
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
    ancestry: { name: string; trait: string } | null;
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
    weapons: { option: string; label: string }[];
};

interface CharacterAttributes extends CreatureAttributes {
    /** The perception skill. */
    perception: CharacterPerception;
    /** The class DC, used for saves related to class abilities. */
    classDC: ClassDCData;
    /** The best spell DC, used for certain saves related to feats */
    spellDC: { rank: number; value: number } | null;
    /** the higher between highest spellcasting DC and (if present) class DC */
    classOrSpellDC: { rank: number; value: number };
    /** Creature armor class, used to defend against attacks. */
    ac: CharacterArmorClass;
    /** Initiative, used to determine turn order in combat. */
    initiative: CreatureInitiative;

    /** Dexterity modifier cap to AC. Undefined means no limit. */
    dexCap: DexterityModifierCapData[];

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

    /** The current dying level (and maximum) for this character. */
    dying: { value: number; max: number; recoveryDC: number };
    /** The current wounded level (and maximum) for this character. */
    wounded: { value: number; max: number };
    /** The current doomed level (and maximum) for this character. */
    doomed: { value: number; max: number };

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

interface GrantedFeat {
    feat: FeatPF2e;
    grants: GrantedFeat[];
}

interface SlottedFeat {
    id: string;
    level: number | string;
    feat?: FeatData;
    grants: GrantedFeat[];
}

interface BonusFeat {
    feat: FeatData;
    grants: GrantedFeat[];
}

interface FeatSlot {
    label: string;
    feats: (SlottedFeat | BonusFeat)[];
    /** Whether the feats are slotted by level or free-form */
    slotted?: boolean;
    featFilter?: string;
    supported: FeatType[] | "all";
}

export {
    AuxiliaryAction,
    BaseWeaponProficiencyKey,
    BonusFeat,
    CategoryProficiencies,
    CharacterArmorClass,
    CharacterAttributes,
    CharacterData,
    CharacterDetails,
    CharacterProficiency,
    CharacterResources,
    CharacterSaves,
    CharacterSkillData,
    CharacterSource,
    CharacterStrike,
    CharacterSystemData,
    ClassDCData,
    FeatSlot,
    GrantedFeat,
    LinkedProficiency,
    MagicTraditionProficiencies,
    MartialProficiencies,
    MartialProficiency,
    MartialProficiencyKey,
    SlottedFeat,
    WeaponGroupProficiencyKey,
};
