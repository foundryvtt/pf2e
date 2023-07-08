import { DexterityModifierCapData } from "@actor/character/types.ts";
import { Abilities } from "@actor/creature/data.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { StatisticModifier } from "@actor/modifiers.ts";
import { AbilityString, ActorAlliance, SkillLongForm } from "@actor/types.ts";
import { ConsumablePF2e, MeleePF2e, WeaponPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { DocumentSchemaRecord, Rarity, Size, ValueAndMaybeMax, ZeroToTwo } from "@module/data.ts";
import { AutoChangeEntry } from "@module/rules/rule-element/ae-like.ts";
import { RollParameters, AttackRollParams, DamageRollParams } from "@module/system/rolls.ts";
import { CheckRoll } from "@system/check/roll.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { ActorType } from "./index.ts";
import { ImmunityData, ImmunitySource, ResistanceData, ResistanceSource, WeaknessData, WeaknessSource } from "./iwr.ts";
import { ActorPF2e } from "@actor/base.ts";
import { StatisticTraceData } from "@system/statistic/data.ts";

/** Base interface for all actor data */
interface BaseActorSourcePF2e<TType extends ActorType, TSystemSource extends ActorSystemSource = ActorSystemSource>
    extends foundry.documents.ActorSource<TType, TSystemSource, ItemSourcePF2e> {
    flags: DeepPartial<ActorFlagsPF2e>;
    prototypeToken: PrototypeTokenSourcePF2e;
}

interface ActorFlagsPF2e extends foundry.documents.ActorFlags {
    pf2e: {
        rollOptions: RollOptionFlags;
        /** IDs of granted items that are tracked */
        trackedItems: Record<string, string>;
        [key: string]: unknown;
    };
}

interface ActorSystemSource {
    details?: ActorDetailsSource;
    attributes: ActorAttributesSource;
    traits?: ActorTraitsSource<string>;

    /** A record of this actor's current world schema version as well a log of the last migration to occur */
    schema: DocumentSchemaRecord;
}

interface ActorAttributesSource {
    hp?: ActorHitPointsSource;
    perception?: { value: number };
    immunities?: ImmunitySource[];
    weaknesses?: WeaknessSource[];
    resistances?: ResistanceSource[];
}

interface ActorHitPointsSource extends ValueAndMaybeMax {
    temp?: number;
}

interface ActorDetailsSource {
    level?: { value: number };
    alliance?: ActorAlliance;
    creature?: unknown;
}

interface ActorSystemData extends ActorSystemSource {
    abilities?: Abilities;
    details: ActorDetails;
    actions?: StrikeData[];
    attributes: ActorAttributes;
    traits?: ActorTraitsData<string>;
    /** An audit log of automatic, non-modifier changes applied to various actor data nodes */
    autoChanges: Record<string, AutoChangeEntry[] | undefined>;
}

interface ActorAttributes extends ActorAttributesSource {
    hp?: ActorHitPoints;
    ac?: { value: number };
    immunities: ImmunityData[];
    weaknesses: WeaknessData[];
    resistances: ResistanceData[];
    initiative?: InitiativeData;
    shield?: {
        raised: boolean;
        broken: boolean;
    };
    flanking: {
        /** Whether the actor can flank at all */
        canFlank: boolean;
        /** Given the actor can flank, the conditions under which it can do so without an ally opposite the target */
        canGangUp: GangUpCircumstance[];
        /** Whether the actor can be flanked at all */
        flankable: boolean;
        /** Given the actor is flankable, whether it is flat-footed when flanked */
        flatFootable: FlatFootableCircumstance;
    };
}

interface ActorHitPoints extends Required<BaseHitPointsSource> {
    negativeHealing: boolean;
}

interface ActorDetails extends ActorDetailsSource {
    level: { value: number };
    alliance: ActorAlliance;
}

interface RollOptionFlags {
    all: Record<string, boolean | undefined>;
    [key: string]: Record<string, boolean | undefined> | undefined;
}

/** Basic hitpoints data fields */
interface BaseHitPointsSource {
    /** The current amount of hitpoints the character has. */
    value: number;
    /** The maximum number of hitpoints this character has. */
    max?: number;
    /** If defined, the amount of temporary hitpoints this character has. */
    temp: number;
    /** Any details about hit points. */
    details: string;
}

type FlatFootableCircumstance =
    /** Flat-footable in all flanking situations */
    | true
    /** Flat-footable if the flanker's level is less than or equal to the actor's own */
    | number
    /** Never flat-footable */
    | false;

type GangUpCircumstance =
    /** Requires at least `number` allies within melee reach of the target */
    | number
    /** Requires the actor's animal companion to be adjacent to the target */
    | "animal-companion";

/** Data related to actor hitpoints. */
// expose _modifiers field to allow initialization in data preparation
type HitPointsData = StatisticModifier & Required<BaseHitPointsSource>;

interface ActorTraitsSource<TTrait extends string> {
    /** Actual Pathfinder traits */
    value: TTrait[];
    /** The rarity of the actor (common, uncommon, etc.) */
    rarity?: Rarity;
    /** The character size (such as 'med'). */
    size?: { value: Size };
}

interface ActorTraitsData<TTrait extends string> extends ActorTraitsSource<TTrait> {
    rarity: Rarity;
    size: ActorSizePF2e;
}

/** Basic skill and save data (not including custom modifiers). */
interface AbilityBasedStatistic {
    /** The actual modifier for this martial type. */
    value: number;
    /** Describes how the value was computed. */
    breakdown: string;
    /** The ability which this save scales off of. */
    ability?: AbilityString;
}

/** A roll function which can be called to roll a given skill. */
type RollFunction<T extends RollParameters = RollParameters> = (
    params: T
) => Promise<Rolled<CheckRoll> | null | string | void>;

type DamageRollFunction = (params?: DamageRollParams) => Promise<string | Rolled<DamageRoll> | null>;

interface InitiativeData extends StatisticTraceData {
    statistic: SkillLongForm | "perception";
    /**
     * If a pair of initiative rolls are tied, the next resolution step is the tiebreak priority. A lower value
     * constitutes a higher priority.
     */
    tiebreakPriority: ZeroToTwo;
}

/** The full data for character perception rolls (which behave similarly to skills). */
type PerceptionData = StatisticTraceData & AbilityBasedStatistic;

/** The full data for character AC; includes the armor check penalty. */
interface ArmorClassData {
    /** The actual AC value */
    value: number;
    /** A textual breakdown of the modifiers that compose the value */
    breakdown: string;
    /** The armor check penalty imposed by the worn armor. */
    check?: number;
    /** The cap for the bonus that dexterity can give to AC, if any. If null, there is no cap. */
    dexCap?: DexterityModifierCapData;
}

interface TraitViewData {
    /** The name of this action. */
    name: string;
    /** The label for this action which will be rendered on the UI. */
    label: string;
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
interface StrikeData extends StatisticModifier {
    slug: string;
    label: string;
    /** The type of action; currently just 'strike'. */
    type: "strike";
    /** The image URL for this strike (shown on the UI). */
    imageUrl: ImageFilePath;
    /** The glyph for this strike (how many actions it takes, reaction, etc). */
    glyph: string;
    /** A description of this strike. */
    description: string;
    /** A description of what happens on a critical success. */
    criticalSuccess: string;
    /** A description of what happens on a success. */
    success: string;
    /** Any traits this strike has. */
    traits: TraitViewData[];
    /** Any options always applied to this strike. */
    options: string[];
    /** Whether the strike is ready (usually when the weapon corresponding with the strike is equipped) */
    ready: boolean;
    /** Alias for `attack`. */
    roll?: RollFunction<AttackRollParams>;
    /** Roll to attack with the given strike (with no MAP penalty; see `variants` for MAP penalties.) */
    attack?: RollFunction<AttackRollParams>;
    /** Roll normal (non-critical) damage for this weapon. */
    damage?: DamageRollFunction;
    /** Roll critical damage for this weapon. */
    critical?: DamageRollFunction;
    /** Alternative usages of a strike weapon: thrown, combination-melee, etc. */
    altUsages?: StrikeData[];
    /** A list of attack variants which apply the Multiple Attack Penalty. */
    variants: { label: string; roll: RollFunction<AttackRollParams> }[];

    /** Ammunition choices and selected ammo if this is a ammo consuming weapon. */
    ammunition?: {
        compatible: ConsumablePF2e[];
        incompatible: ConsumablePF2e[];
        selected: {
            id: string;
            compatible: boolean;
        } | null;
    };

    /** The weapon or melee item--possibly ephemeral--being used for the strike */
    item: WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>;
}

/** Any skill or similar which provides a roll option for rolling this save. */
interface Rollable {
    /** Roll this save or skill with the given options (caused by the given event, and with the given optional callback). */
    roll: RollFunction;
}

interface PrototypeTokenSourcePF2e extends foundry.data.PrototypeTokenSource {
    flags: foundry.data.PrototypeToken<ActorPF2e>["flags"] & {
        pf2e?: {
            linkToActorSize?: boolean;
            autoscale?: boolean;
        };
    };
}

interface PrototypeTokenPF2e<TParent extends ActorPF2e | null> extends foundry.data.PrototypeToken<TParent> {
    flags: foundry.data.PrototypeToken<NonNullable<TParent>>["flags"] & {
        pf2e: {
            linkToActorSize: boolean;
            autoscale: boolean;
        };
    };
}

export {
    AbilityBasedStatistic,
    ActorAttributes,
    ActorAttributesSource,
    ActorDetails,
    ActorDetailsSource,
    ActorFlagsPF2e,
    ActorHitPoints,
    ActorSystemData,
    ActorSystemSource,
    ActorTraitsData,
    ActorTraitsSource,
    ArmorClassData,
    BaseActorSourcePF2e,
    BaseHitPointsSource,
    DamageRollFunction,
    GangUpCircumstance,
    HitPointsData,
    InitiativeData,
    PerceptionData,
    PrototypeTokenPF2e,
    RollFunction,
    RollOptionFlags,
    Rollable,
    StrikeData,
    TraitViewData,
};
