import { DamageType } from '@module/damage-calculation';
import { LabeledNumber, LabeledValue, Rarity, Size, ValuesList } from '@module/data';
import { ActorType } from '.';
import type { ActorPF2e } from '@actor/base';
import type { ActiveEffectPF2e } from '@module/active-effect';
import type { ItemPF2e } from '@item/base';
import { CheckModifier, StatisticModifier } from '@module/modifiers';
import { ABILITY_ABBREVIATIONS } from './values';
import { RollParameters } from '@module/system/rolls';
import { ConsumableData } from '@item/consumable/data';
import { ItemSourcePF2e } from '@item/data';

export interface BaseActorSourcePF2e<
    TActorType extends ActorType = ActorType,
    TSystemData extends ActorSystemData = ActorSystemData,
> extends foundry.data.ActorSource {
    type: TActorType;
    data: TSystemData;
    items: ItemSourcePF2e[];
}

/** Base class for all actor data */
export abstract class BaseActorDataPF2e<TActor extends ActorPF2e = ActorPF2e> extends foundry.data.ActorData<
    TActor,
    ActiveEffectPF2e,
    ItemPF2e
> {}

export interface BaseActorDataPF2e
    extends Omit<BaseActorSourcePF2e<ActorType, ActorSystemData>, 'effects' | 'items' | 'token'> {
    type: BaseActorSourcePF2e['type'];
    data: BaseActorSourcePF2e['data'];

    readonly _source: BaseActorSourcePF2e;
}

/** Basic hitpoints data fields */
export interface BaseHitPointsData {
    /** The current amount of hitpoints the character has. */
    value: number;
    /** The maximum number of hitpoints this character has. */
    max: number;
    /** If defined, the amount of temporary hitpoints this character has. */
    temp: number;
    /** Any details about hit points. */
    details: string;
}

export interface BaseActorAttributes {
    hp: BaseHitPointsData;
}

/** Data related to actor hitpoints. */
// expose _modifiers field to allow initialization in data preparation
export type HitPointsData = StatisticModifier & BaseHitPointsData;

export interface ActorSystemData {
    attributes: BaseActorAttributes;
    traits: BaseTraitsData;
    tokenEffects: TemporaryEffect[];
}

export interface BaseTraitsData {
    /** The rarity of the actor (common, uncommon, etc.) */
    rarity: { value: Rarity };
    /** The character size (such as 'med'). */
    size: { value: Size };
    /** Actual Pathfinder traits */
    traits: ValuesList;
    /** Condition immunities */
    ci: LabeledValue[];
    /** Damage immunities this actor has. */
    di: ValuesList<Exclude<DamageType, 'untyped'>>;
    /** Damage resistances that this actor has. */
    dr: LabeledNumber[];
    /** Damage vulnerabilities that this actor has. */
    dv: LabeledNumber[];
}

/** Data describing the proficiency with a given type of check */
export interface ProficiencyData {
    /** The actual modifier for this martial type. */
    value: number;
    /** A breakdown describing the how the martial proficiency value is computed. */
    breakdown: string;
}

export type AbilityString = typeof ABILITY_ABBREVIATIONS[number];

/** Basic skill and save data (not including custom modifiers). */
export interface RawSkillData extends ProficiencyData {
    /** The ability which this save scales off of. */
    ability: AbilityString;
    /** The raw modifier for this save (after applying all modifiers). */
    item: number;
    /** A breakdown of how the save value is determined. */
    armor?: number;
}

/** A roll function which can be called to roll a given skill. */
export type RollFunction = (parameters: RollParameters) => void;

/** Basic initiative-relevant data. */
export interface RawInitiativeData {
    /** What skill or ability is currently being used to compute initiative. */
    ability: AbilityString | 'perception';
    /** The textual name for what type of initiative is being rolled (usually includes the skill). */
    label: string;
}

/** The full data for charatcer initiative. */
export type InitiativeData = CheckModifier & RawInitiativeData & Rollable;
/** The full data for character perception rolls (which behave similarly to skills). */
export type PerceptionData = StatisticModifier & RawSkillData & Rollable;
/** The full data for character AC; includes the armor check penalty. */

/** Single source of a Dexterity modifier cap to Armor Class, including the cap value itself. */
export interface DexterityModifierCapData {
    /** The numeric value that constitutes the maximum Dexterity modifier. */
    value: number;
    /** The source of this Dex cap - usually the name of an armor, a monk stance, or a spell. */
    source: string;
}

export interface ArmorClassData extends RawSkillData, StatisticModifier {
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
    toggle: boolean;
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
    type: 'strike';
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

    /** A list of ammo to choose for this attack */
    ammo?: RawObject<ConsumableData>[];
    /** Currently selected ammo id that will be consumed when rolling this action */
    selectedAmmoId?: string;
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
