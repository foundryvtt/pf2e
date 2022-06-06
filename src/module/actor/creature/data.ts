import { SaveType } from "@actor/data";
import {
    AbilityBasedStatistic,
    AbilityString,
    ActorSystemData,
    ActorSystemSource,
    BaseActorAttributes,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseTraitsData,
    HitPointsData,
    InitiativeData,
    Rollable,
    StrikeData,
} from "@actor/data/base";
import { SkillLongForm } from "@actor/data/types";
import type { CREATURE_ACTOR_TYPES, SKILL_ABBREVIATIONS } from "@actor/data/values";
import { CheckModifier, DamageDicePF2e, ModifierPF2e, RawModifier, StatisticModifier } from "@actor/modifiers";
import { ActorAlliance } from "@actor/types";
import { CreatureTraits } from "@item/ancestry/data";
import { LabeledValue, ValueAndMax, ValuesList, ZeroToThree, ZeroToTwo } from "@module/data";
import { CombatantPF2e } from "@module/encounter";
import { RollDataPF2e, RollParameters } from "@system/rolls";
import { Statistic, StatisticCompatData } from "@system/statistic";
import type { CreaturePF2e } from ".";
import { CreatureSensePF2e, SenseAcuity, SenseType } from "./sense";
import { Alignment, AlignmentTrait } from "./types";

type BaseCreatureSource<
    TType extends CreatureType = CreatureType,
    TSystemSource extends CreatureSystemSource = CreatureSystemSource
> = BaseActorSourcePF2e<TType, TSystemSource>;

interface BaseCreatureData<
    TItem extends CreaturePF2e = CreaturePF2e,
    TType extends CreatureType = CreatureType,
    TSystemData extends CreatureSystemData = CreatureSystemData,
    TSource extends BaseCreatureSource<TType> = BaseCreatureSource<TType>
> extends Omit<BaseCreatureSource<TType>, "data" | "effects" | "flags" | "items" | "token" | "type">,
        BaseActorDataPF2e<TItem, TType, TSystemData, TSource> {}

/** Skill and Lore statistics for rolling. Both short and longform are supported, but eventually only long form will be */
type CreatureSkills = Record<SkillAbbreviation, Statistic> &
    Record<SkillLongForm, Statistic> &
    Partial<Record<string, Statistic>>;

interface CreatureSystemSource extends ActorSystemSource {
    details?: {
        level?: { value: number };
        alliance?: ActorAlliance;
        [key: string]: unknown;
    };

    /** Traits, languages, and other information. */
    traits?: CreatureTraitsData;

    /** Maps roll types -> a list of modifiers which should affect that roll type. */
    customModifiers?: Record<string, RawModifier[]>;

    /** Saving throw data */
    saves?: Record<SaveType, { value?: number; mod?: number }>;
}

type CreatureDetails = {
    /** The alignment this creature has */
    alignment: { value: Alignment };
    /** The alliance this NPC belongs to: relevant to mechanics like flanking */
    alliance: ActorAlliance;
    /** The creature level for this actor */
    level: { value: number };
};

interface CreatureSystemData extends CreatureSystemSource, ActorSystemData {
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

    actions?: StrikeData[];
}

type CreatureType = typeof CREATURE_ACTOR_TYPES[number];

interface SenseData {
    type: SenseType;
    acuity?: SenseAcuity;
    value: string;
    source?: string;
}

/** Data describing the value & modifier for a base ability score. */
interface AbilityData {
    /** The raw value of this ability score; computed from the mod for npcs automatically. */
    value: number;
    /** The modifier for this ability; computed from the value for characters automatically. */
    mod: number;
}

type SkillAbbreviation = SetElement<typeof SKILL_ABBREVIATIONS>;

type Abilities = Record<AbilityString, AbilityData>;

/** A type representing the possible ability strings. */
type Language = keyof ConfigPF2e["PF2E"]["languages"];
type Attitude = keyof ConfigPF2e["PF2E"]["attitude"];
type CreatureTrait = keyof ConfigPF2e["PF2E"]["creatureTraits"] | AlignmentTrait;

interface CreatureTraitsData extends BaseTraitsData {
    traits: BaseTraitsData["traits"] & {
        /** Actual Pathfinder traits */
        traits: CreatureTraits;
    };
    /** A list of special senses this character has. */
    senses: CreatureSensePF2e[];
    /** Languages which this actor knows and can speak. */
    languages: ValuesList<Language>;
    /** Attitude, describes the attitude of a npc towards the PCs, e.g. hostile, friendly */
    attitude: { value: Attitude };
}

type SkillData = StatisticModifier & AbilityBasedStatistic & Rollable;

/** The full save data for a character; including its modifiers and other details */
type SaveData = StatisticCompatData & AbilityBasedStatistic & { saveDetail?: string };

type CreatureSaves = Record<SaveType, SaveData>;

/** Miscallenous but mechanically relevant creature attributes.  */
interface CreatureAttributes extends BaseActorAttributes {
    hp: CreatureHitPoints;
    ac: { value: number };
    hardness?: { value: number };
    perception: { value: number };

    /** The creature's natural reach */
    reach: {
        /** The reach for any unqualified purpose */
        general: number;
        /** Its reach for the purpose of manipulate actions, usually the same as its general reach */
        manipulate: number;
    };

    speed: CreatureSpeeds;
}

interface CreatureSpeeds extends StatisticModifier {
    /** The actor's primary speed (usually walking/stride speed). */
    value: string;
    /** Other speeds that this actor can use (such as swim, climb, etc). */
    otherSpeeds: LabeledSpeed[];
    /** The derived value after applying modifiers, bonuses, and penalties */
    total: number;
}

type MovementType = "land" | "burrow" | "climb" | "fly" | "swim";
interface LabeledSpeed extends LabeledValue {
    type: Exclude<MovementType, "land">;
    value: string;
    label: string;
}

interface CreatureHitPoints extends HitPointsData {
    negativeHealing: boolean;
}

interface InitiativeRollParams extends RollParameters {
    /** Whether the encounter tracker should be updated with the roll result */
    updateTracker?: boolean;
    skipDialog: boolean;
}

interface InitiativeRollResult {
    combatant: CombatantPF2e;
    roll: Rolled<Roll<RollDataPF2e>>;
}

type CreatureInitiative = InitiativeData &
    CheckModifier & {
        roll: (parameters: InitiativeRollParams) => Promise<InitiativeRollResult | null>;
        /**
         * If a pair of initiative rolls are tied, the next resolution step is the tiebreak priority. A lower value
         * constitutes a higher priority.
         */
        tiebreakPriority: ZeroToTwo;
    };

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
    icon: ImagePath;
}

export {
    Abilities,
    AbilityData,
    Attitude,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureHitPoints,
    CreatureInitiative,
    CreatureSaves,
    CreatureSkills,
    CreatureSpeeds,
    CreatureSystemData,
    CreatureSystemSource,
    CreatureTrait,
    CreatureTraitsData,
    CreatureType,
    HeldShieldData,
    InitiativeRollParams,
    InitiativeRollResult,
    LabeledSpeed,
    Language,
    MovementType,
    SaveData,
    SenseData,
    SkillAbbreviation,
    SkillData,
    VisionLevel,
    VisionLevels,
};
