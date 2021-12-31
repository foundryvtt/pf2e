import { DocumentSchemaRecord, LabeledNumber, LabeledValue, Rarity, Size, ValueAndMax, ValuesList } from "@module/data";
import { ActorType } from ".";
import type { ActorPF2e } from "@actor/base";
import type { ActiveEffectPF2e } from "@module/active-effect";
import type { ItemPF2e } from "@item/base";
import { StatisticModifier } from "@module/modifiers";
import { ABILITY_ABBREVIATIONS, IMMUNITY_TYPES, RESISTANCE_TYPES, WEAKNESS_TYPES } from "./values";
import { RollParameters } from "@module/system/rolls";
import { ConsumableData } from "@item/consumable/data";
import { ItemSourcePF2e } from "@item/data";
import { AutoChangeEntry } from "@module/rules/elements/ae-like";
import { WeaponPF2e } from "@item";
import { ActorSizePF2e } from "@actor/data/size";
import { SkillAbbreviation } from "@actor/creature/data";

export interface BaseActorSourcePF2e<
    TActorType extends ActorType = ActorType,
    TSystemSource extends ActorSystemSource = ActorSystemSource
> extends foundry.data.ActorSource {
    type: TActorType;
    data: TSystemSource;
    items: ItemSourcePF2e[];
    flags: DeepPartial<ActorFlagsPF2e>;
}

/** Base class for all actor data */
export abstract class BaseActorDataPF2e<TActor extends ActorPF2e = ActorPF2e> extends foundry.data.ActorData<
    TActor,
    ActiveEffectPF2e,
    ItemPF2e
> {}

export interface BaseActorDataPF2e
    extends Omit<BaseActorSourcePF2e<ActorType, ActorSystemData>, "effects" | "items" | "token"> {
    type: BaseActorSourcePF2e["type"];
    data: ActorSystemData;
    flags: ActorFlagsPF2e;

    readonly _source: BaseActorSourcePF2e;
}

export interface ActorSystemSource {
    attributes: {
        hp?: ValueAndMax;
    };
    traits?: BaseTraitsSource;
    /** A record of this actor's current world schema version as well a log of the last migration to occur */
    schema: DocumentSchemaRecord;
}

export interface ActorSystemData extends ActorSystemSource {
    attributes: BaseActorAttributes;
    traits: BaseTraitsData;
    /** Icons appearing in the Effects Tracker application */
    tokenEffects: TemporaryEffect[];
    /** An audit log of automatic, non-modifier changes applied to various actor data nodes */
    autoChanges: Record<string, AutoChangeEntry[] | undefined>;
}

export interface RollOptionFlags {
    all: Record<string, boolean | undefined>;
    [key: string]: Record<string, boolean | undefined> | undefined;
}

export interface ActorFlagsPF2e extends foundry.data.ActorFlags {
    pf2e: {
        rollOptions: RollOptionFlags;
        [key: string]: any;
    };
}

/** Basic hitpoints data fields */
export interface BaseHitPointsData {
    /** The current amount of hitpoints the character has. */
    value: number;
    /** The maximum number of hitpoints this character has. */
    max?: number;
    /** If defined, the amount of temporary hitpoints this character has. */
    temp: number;
    /** Any details about hit points. */
    details: string;
}

export interface BaseActorAttributes {
    hp?: Required<BaseHitPointsData>;
}

/** Data related to actor hitpoints. */
// expose _modifiers field to allow initialization in data preparation
export type HitPointsData = StatisticModifier & Required<BaseHitPointsData>;

export type ImmunityType = SetElement<typeof IMMUNITY_TYPES>;
export type WeaknessType = SetElement<typeof WEAKNESS_TYPES>;
export interface LabeledWeakness extends LabeledNumber {
    type: WeaknessType;
}
export type ResistanceType = SetElement<typeof RESISTANCE_TYPES>;
export interface LabeledResistance extends LabeledNumber {
    type: ResistanceType;
}

export interface BaseTraitsSource {
    /** The rarity of the actor (common, uncommon, etc.) */
    rarity: Rarity;
    /** The character size (such as 'med'). */
    size: { value: Size };
    /** Actual Pathfinder traits */
    traits: ValuesList;
    /** Condition immunities */
    ci: LabeledValue[];
    /** Damage immunities this actor has. */
    di: ValuesList<ImmunityType>;
    /** Damage resistances that this actor has. */
    dr: LabeledResistance[];
    /** Damage vulnerabilities that this actor has. */
    dv: LabeledWeakness[];
}

export interface BaseTraitsData extends BaseTraitsSource {
    size: ActorSizePF2e;
}

export type AbilityString = typeof ABILITY_ABBREVIATIONS[number];

/** Basic skill and save data (not including custom modifiers). */
export interface AbilityBasedStatistic {
    /** The actual modifier for this martial type. */
    value: number;
    /** Describes how the value was computed. */
    breakdown: string;
    /** The ability which this save scales off of. */
    ability?: AbilityString;
}

/** A roll function which can be called to roll a given skill. */
export type RollFunction = (parameters: RollParameters) => string | void | Promise<void>;

/** Basic initiative-relevant data. */
export interface InitiativeData {
    /** What skill or ability is currently being used to compute initiative. */
    ability: SkillAbbreviation | "perception";
    /** The textual name for what type of initiative is being rolled (usually includes the skill). */
    label?: string;
}

/** The full data for character perception rolls (which behave similarly to skills). */
export type PerceptionData = StatisticModifier & AbilityBasedStatistic & Rollable;
/** The full data for character AC; includes the armor check penalty. */

/** Single source of a Dexterity modifier cap to Armor Class, including the cap value itself. */
export interface DexterityModifierCapData {
    /** The numeric value that constitutes the maximum Dexterity modifier. */
    value: number;
    /** The source of this Dex cap - usually the name of an armor, a monk stance, or a spell. */
    source: string;
}

export interface ArmorClassData {
    /** The actual AC value */
    value: number;
    /** A textual breakdown of the modifiers that compose the value */
    breakdown: string;
    /** The armor check penalty imposed by the worn armor. */
    check?: number;
    /** The cap for the bonus that dexterity can give to AC, if any. If null, there is no cap. */
    dexCap?: DexterityModifierCapData;
}

export interface StrikeTrait {
    /** The name of this action. */
    name: string;
    /** The label for this action which will be rendered on the UI. */
    label: string;
    /** If true, this trait is toggleable. */
    toggle?: boolean;
    /** The roll this trait applies to, if relevant. */
    rollName?: string;
    /** The option that this trait applies to the roll (of type `rollName`). */
    rollOption?: string;
    /** An extra css class added to the UI marker for this trait. */
    cssClass?: string;
    /** The description of the trait */
    description?: string;
}

/** An strike which a character can use. */
export interface StrikeData {
    /** The type of action; currently just 'strike'. */
    type: "strike";
    /** The image URL for this strike (shown on the UI). */
    imageUrl: string;
    /** The glyph for this strike (how many actions it takes, reaction, etc). */
    glyph: string;
    /** A description of this strike. */
    description: string;
    /** A description of what happens on a critical success. */
    criticalSuccess: string;
    /** A description of what happens on a success. */
    success: string;
    /** Any traits this strike has. */
    traits: StrikeTrait[];
    /** Any options always applied to this strike. */
    options: string[];

    /** Alias for `attack`. */
    roll?: RollFunction;
    /** Roll to attack with the given strike (with no MAP penalty; see `variants` for MAP penalties.) */
    attack?: RollFunction;
    /** Roll normal (non-critical) damage for this weapon. */
    damage?: RollFunction;
    /** Roll critical damage for this weapon. */
    critical?: RollFunction;

    /** A list of attack variants which apply the Multiple Attack Penalty. */
    variants: { label: string; roll: RollFunction }[];

    /** Ammunition choices and selected ammo if this is a ammo consuming weapon. */
    ammunition?: {
        compatible: RawObject<ConsumableData>[];
        incompatible: RawObject<ConsumableData>[];
        selected?: {
            id: string;
            compatible: boolean;
        };
    };

    /** The item that generated this strike */
    origin?: Embedded<ItemPF2e> | null;
    /** The weapon (possibly ephemeral) behind this strike */
    weapon?: Embedded<WeaponPF2e>;
}

export interface RollToggle {
    label: string;
    inputName: string;
    checked: boolean;
}

/** Any skill or similar which provides a roll option for rolling this save. */
export interface Rollable {
    /** Roll this save or skill with the given options (caused by the given event, and with the given optional callback). */
    roll: RollFunction;
}
