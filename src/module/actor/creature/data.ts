import {
    AbilityBasedStatistic,
    ActorSystemData,
    ActorSystemSource,
    ActorAttributes,
    BaseActorSourcePF2e,
    ActorTraitsData,
    ActorTraitsSource,
    HitPointsData,
    StrikeData,
} from "@actor/data/base.ts";
import { DamageDicePF2e, ModifierPF2e, RawModifier, StatisticModifier } from "@actor/modifiers.ts";
import type {
    AbilityString,
    ActorAlliance,
    MovementType,
    SaveType,
    SkillAbbreviation,
    SkillLongForm,
} from "@actor/types.ts";
import type { CREATURE_ACTOR_TYPES } from "@actor/values.ts";
import { LabeledNumber, Size, ValueAndMax, ValuesList, ZeroToThree } from "@module/data.ts";
import { Statistic, StatisticTraceData } from "@system/statistic/index.ts";
import { CreatureSensePF2e, SenseAcuity, SenseType } from "./sense.ts";
import { Alignment, CreatureTrait } from "./types.ts";

type BaseCreatureSource<TType extends CreatureType, TSystemSource extends CreatureSystemSource> = BaseActorSourcePF2e<
    TType,
    TSystemSource
>;

/** Skill and Lore statistics for rolling. */
type CreatureSkills = Record<SkillLongForm, Statistic> & Partial<Record<string, Statistic>>;

interface CreatureSystemSource extends ActorSystemSource {
    details?: {
        level?: { value: number };
        alliance?: ActorAlliance;
        /** Present on familiars */
        creature?: unknown;
    };

    /** Traits, languages, and other information. */
    traits?: CreatureTraitsSource;

    /** Maps roll types -> a list of modifiers which should affect that roll type. */
    customModifiers?: Record<string, RawModifier[]>;

    /** Saving throw data */
    saves?: Record<SaveType, { value?: number; mod?: number }>;

    resources?: CreatureResourcesSource;
}

type CreatureDetails = {
    /** The alignment this creature has */
    alignment: { value: Alignment };
    /** The alliance this NPC belongs to: relevant to mechanics like flanking */
    alliance: ActorAlliance;
    /** The creature level for this actor */
    level: { value: number };
};

interface CreatureTraitsSource extends ActorTraitsSource<CreatureTrait> {
    /** Languages which this actor knows and can speak. */
    languages: ValuesList<Language>;

    size?: { value: Size };
}

interface CreatureResourcesSource {
    focus?: {
        value: number;
        max?: number;
    };
}

interface CreatureSystemData extends Omit<CreatureSystemSource, "attributes">, ActorSystemData {
    abilities?: Abilities;

    details: CreatureDetails;

    /** Traits, languages, and other information. */
    traits: CreatureTraitsData;

    attributes: CreatureAttributes;

    /** Maps roll types -> a list of modifiers which should affect that roll type. */
    customModifiers: Record<string, ModifierPF2e[]>;
    /** Maps damage roll types -> a list of damage dice which should be added to that damage roll type. */
    damageDice: Record<string, DamageDicePF2e[]>;

    /** Saving throw data */
    saves: CreatureSaves;

    skills: Record<SkillAbbreviation, SkillData>;

    actions?: StrikeData[];
    resources?: CreatureResources;
}

type CreatureType = (typeof CREATURE_ACTOR_TYPES)[number];

interface SenseData {
    type: SenseType;
    acuity?: SenseAcuity;
    value?: string;
    source?: string;
}

/** Data describing the value & modifier for a base ability score. */
interface AbilityData {
    /** The ability score: computed from the mod for npcs automatically. */
    value: number;
    /** The modifier for this ability; computed from the value for characters automatically. */
    mod: number;
}

type Abilities = Record<AbilityString, AbilityData>;

/** A type representing the possible ability strings. */
type Language = keyof ConfigPF2e["PF2E"]["languages"];
type Attitude = keyof ConfigPF2e["PF2E"]["attitude"];

interface CreatureTraitsData extends ActorTraitsData<CreatureTrait>, Omit<CreatureTraitsSource, "rarity" | "size"> {
    senses?: { value: string } | CreatureSensePF2e[];
    /** Languages which this actor knows and can speak. */
    languages: ValuesList<Language>;
}

type SkillData = StatisticTraceData & AbilityBasedStatistic;

/** The full save data for a character; including its modifiers and other details */
type SaveData = StatisticTraceData & AbilityBasedStatistic & { saveDetail?: string };

type CreatureSaves = Record<SaveType, SaveData>;

/** Miscallenous but mechanically relevant creature attributes.  */
interface CreatureAttributes extends ActorAttributes {
    hp: CreatureHitPoints;
    ac: { value: number };
    hardness?: { value: number };
    perception: CreaturePerception;

    /** The creature's natural reach */
    reach: {
        /** The default reach for all actions requiring one */
        base: number;
        /** Its reach for the purpose of manipulate actions, usually the same as its base reach */
        manipulate: number;
    };

    senses: { value: string } | CreatureSensePF2e[];

    speed: CreatureSpeeds;

    /** The current dying level (and maximum) for this creature. */
    dying: ValueAndMax & { recoveryDC: number };
    /** The current wounded level (and maximum) for this creature. */
    wounded: ValueAndMax;
    /** The current doomed level (and maximum) for this creature. */
    doomed: ValueAndMax;

    /** Whether this creature emits sound */
    emitsSound: boolean;
}

type CreaturePerception = StatisticTraceData;

interface CreatureSpeeds extends StatisticModifier {
    /** The actor's primary speed (usually walking/stride speed). */
    value: number;
    /** Other speeds that this actor can use (such as swim, climb, etc). */
    otherSpeeds: LabeledSpeed[];
    /** The derived value after applying modifiers, bonuses, and penalties */
    total: number;
}

interface LabeledSpeed extends Omit<LabeledNumber, "exceptions"> {
    type: MovementType;
    source?: string;
    total?: number;
    derivedFromLand?: boolean;
}

interface CreatureHitPoints extends HitPointsData {
    negativeHealing: boolean;
}

/** Creature initiative statistic */
interface CreatureInitiativeSource {
    /** What skill or ability is currently being used to compute initiative. */
    statistic: SkillLongForm | "perception";
}

interface CreatureResources extends CreatureResourcesSource {
    /** The current number of focus points and pool size */
    focus: {
        value: number;
        max: number;
        cap: number;
    };
}

enum VisionLevels {
    BLINDED,
    NORMAL,
    LOWLIGHT,
    DARKVISION,
}

type VisionLevel = ZeroToThree;

/** A PC's or NPC's held shield. An NPC's values can be stored directly on the actor or come from a shield item. */
interface HeldShieldData {
    /** The item ID of the shield if in use or otherwise `null` */
    itemId: string | null;
    /** The name of the shield (defaulting to "Shield" if not from a shield item) */
    name: string;
    /** The shield's AC */
    ac: number;
    /** The shield's hardness */
    hardness: number;
    /** The shield's broken threshold */
    brokenThreshold: number;
    /** The shield's hit points */
    hp: ValueAndMax;
    /** Whether the shield is raised */
    raised: boolean;
    /** Whether the shield is broken */
    broken: boolean;
    /** Whether the shield is destroyed (hp.value === 0) */
    destroyed: boolean;
    /** An effect icon to use when the shield is raised */
    icon: ImageFilePath;
}

export {
    Abilities,
    AbilityData,
    Attitude,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureHitPoints,
    CreatureInitiativeSource,
    CreatureResources,
    CreatureResourcesSource,
    CreatureSaves,
    CreatureSkills,
    CreatureSpeeds,
    CreatureSystemData,
    CreatureSystemSource,
    CreatureTraitsData,
    CreatureTraitsSource,
    CreatureType,
    HeldShieldData,
    LabeledSpeed,
    Language,
    SaveData,
    SenseData,
    SkillAbbreviation,
    SkillData,
    VisionLevel,
    VisionLevels,
};
