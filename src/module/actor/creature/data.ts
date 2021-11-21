import {
    AbilityString,
    ActorSystemData,
    ActorSystemSource,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseTraitsData,
    HitPointsData,
    AbilityBasedStatistic,
    Rollable,
    StrikeData,
    InitiativeData,
} from "@actor/data/base";
import type { CREATURE_ACTOR_TYPES, SKILL_ABBREVIATIONS } from "@actor/data/values";
import { CheckModifier, DamageDicePF2e, ModifierPF2e, RawModifier, StatisticModifier } from "@module/modifiers";
import { LabeledValue, ValuesList, ZeroToThree, ZeroToTwo } from "@module/data";
import type { CreaturePF2e } from ".";
import { SaveType } from "@actor/data";
import { CreatureSensePF2e, SenseAcuity, SenseType } from "./sense";
import { TokenPF2e } from "@module/canvas";
import { CheckDC } from "@system/check-degree-of-success";
import { RollParameters } from "@system/rolls";

export type BaseCreatureSource<
    TCreatureType extends CreatureType = CreatureType,
    TSystemSource extends CreatureSystemSource = CreatureSystemSource
> = BaseActorSourcePF2e<TCreatureType, TSystemSource>;

export class BaseCreatureData<
    TActor extends CreaturePF2e = CreaturePF2e,
    TSystemData extends CreatureSystemData = CreatureSystemData
> extends BaseActorDataPF2e<TActor> {}

export interface BaseCreatureData extends Omit<BaseCreatureSource, "effects" | "flags" | "items" | "token"> {
    readonly type: CreatureType;
    data: CreatureSystemData;
    readonly _source: BaseCreatureSource;
}

export interface CreatureSystemSource extends ActorSystemSource {
    details: Record<string, unknown>;

    /** Traits, languages, and other information. */
    traits?: CreatureTraitsData;

    /** Maps roll types -> a list of modifiers which should affect that roll type. */
    customModifiers?: Record<string, RawModifier[]>;

    /** Saving throw data */
    saves?: Record<SaveType, { value?: number; mod?: number }>;
}

export interface CreatureSystemData extends CreatureSystemSource, ActorSystemData {
    details: {
        alignment: { value: Alignment };
        level: { value: number };
    };

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

export type CreatureType = typeof CREATURE_ACTOR_TYPES[number];

export interface SenseData {
    type: SenseType;
    acuity?: SenseAcuity;
    value: string;
    source?: string;
}

/** Data describing the value & modifier for a base ability score. */
export interface AbilityData {
    /** The raw value of this ability score; computed from the mod for npcs automatically. */
    value: number;
    /** The modifier for this ability; computed from the value for characters automatically. */
    mod: number;
}

export type SkillAbbreviation = typeof SKILL_ABBREVIATIONS[number];

export type Abilities = Record<AbilityString, AbilityData>;

/** A type representing the possible ability strings. */
export type Language = keyof ConfigPF2e["PF2E"]["languages"];
export type Attitude = keyof ConfigPF2e["PF2E"]["attitude"];
export type CreatureTrait = keyof ConfigPF2e["PF2E"]["creatureTraits"];

export interface CreatureTraitsData extends BaseTraitsData {
    /** A list of special senses this character has. */
    senses: CreatureSensePF2e[];
    /** Languages which this actor knows and can speak. */
    languages: ValuesList<Language>;
    /** Attitude, describes the attitude of a npc towards the PCs, e.g. hostile, friendly */
    attitude: { value: Attitude };
    traits: ValuesList;
}

export type SkillData = StatisticModifier & AbilityBasedStatistic & Rollable;

/** The full save data for a character; including its modifiers and other details */
export type SaveData = SkillData & { saveDetail?: string };

type CreatureSaves = Record<SaveType, SaveData>;

/** Miscallenous but mechanically relevant creature attributes.  */
export interface CreatureAttributes {
    hp: CreatureHitPoints;
    ac: { value: number };
    hardness?: { value: number };
    perception: { value: number };
    speed: CreatureSpeeds;
}

export interface CreatureSpeeds extends StatisticModifier {
    /** The actor's primary speed (usually walking/stride speed). */
    value: string;
    /** Other speeds that this actor can use (such as swim, climb, etc). */
    otherSpeeds: LabeledSpeed[];
    /** The derived value after applying modifiers, bonuses, and penalties */
    total: number;
}

export type MovementType = "land" | "burrow" | "climb" | "fly" | "swim";
export interface LabeledSpeed extends LabeledValue {
    type: Exclude<MovementType, "land">;
    value: string;
    label: string;
}

export interface CreatureHitPoints extends HitPointsData {
    negativeHealing: boolean;
}

export type CreatureInitiative = InitiativeData &
    CheckModifier & {
        roll: (parameters: RollParameters) => Promise<void>;
        /**
         * If a pair of initiative rolls are tied, the next resolution step is the tiebreak priority. A lower value
         * constitutes a higher priority.
         */
        tiebreakPriority: ZeroToTwo;
    };

export type Alignment = "LG" | "NG" | "CG" | "LN" | "N" | "CN" | "LE" | "NE" | "CE";

export type AlignmentComponent = "good" | "evil" | "lawful" | "chaotic" | "neutral";

export enum VisionLevels {
    BLINDED,
    NORMAL,
    LOWLIGHT,
    DARKVISION,
}

export type VisionLevel = ZeroToThree;

export interface AttackRollContext {
    options: string[];
    targets: Set<TokenPF2e>;
    dc: CheckDC | null;
    distance: number | null;
}
