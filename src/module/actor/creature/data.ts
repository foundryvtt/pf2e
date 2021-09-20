import {
    AbilityString,
    ActorFlagsPF2e,
    ActorSystemData,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseTraitsData,
    HitPointsData,
    RawSkillData,
    Rollable,
} from "@actor/data/base";
import type { CREATURE_ACTOR_TYPES, SKILL_ABBREVIATIONS } from "@actor/data/values";
import { DamageDicePF2e, ModifierPF2e, StatisticModifier } from "@module/modifiers";
import { LabeledString, LabeledValue, ValuesList, ZeroToThree } from "@module/data";
import type { CreaturePF2e } from ".";
import { SaveType } from "@actor/data";

export type BaseCreatureSource<
    TCreatureType extends CreatureType = CreatureType,
    TSystemData extends CreatureSystemData = CreatureSystemData
> = BaseActorSourcePF2e<TCreatureType, TSystemData>;

export class BaseCreatureData<
    TActor extends CreaturePF2e = CreaturePF2e,
    TSystemData extends CreatureSystemData = CreatureSystemData
> extends BaseActorDataPF2e<TActor> {}

export interface BaseCreatureData extends Omit<BaseCreatureSource, "effects" | "items" | "token"> {
    readonly type: CreatureType;
    data: BaseCreatureSource["data"];
    flags: ActorFlagsPF2e;
    readonly _source: BaseCreatureSource;
}

export interface CreatureSystemData extends ActorSystemData {
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
    saves: Record<SaveType, StatisticModifier>;
}

export type CreatureType = typeof CREATURE_ACTOR_TYPES[number];

export type SenseAcuity = "precise" | "imprecise" | "vague";
export interface SenseData extends LabeledString {
    acuity?: SenseAcuity;
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
    senses: SenseData[];
    /** Languages which this actor knows and can speak. */
    languages: ValuesList<Language>;
    /** Attitude, describes the attitude of a npc towards the PCs, e.g. hostile, friendly */
    attitude: { value: Attitude };
    traits: ValuesList;
}

export type SkillData = StatisticModifier & RawSkillData & Rollable;

/** The full save data for a character; includes statistic modifier and an extra `saveDetail` field for user-provided details. */
export type SaveData = SkillData & { saveDetail?: string };

/** Miscallenous but mechanically relevant creature attributes.  */
export interface CreatureAttributes {
    hp: CreatureHitPoints;
    ac: { value: number };
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
    /** A textual breakdown of the base speed and any modifiers applied to it */
    breakdown?: string;
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

export type Alignment = "LG" | "NG" | "CG" | "LN" | "N" | "CN" | "LE" | "NE" | "CE";

export type AlignmentComponent = "good" | "evil" | "lawful" | "chaotic" | "neutral";

export enum VisionLevels {
    BLINDED,
    NORMAL,
    LOWLIGHT,
    DARKVISION,
}

export type VisionLevel = ZeroToThree;
