import type { ActorPF2e, ActorType } from "@actor";
import type { DexterityModifierCapData } from "@actor/character/types.ts";
import type { Abilities } from "@actor/creature/data.ts";
import type { InitiativeTraceData } from "@actor/initiative.ts";
import type { StatisticModifier } from "@actor/modifiers.ts";
import type { ActorAlliance, AttributeString, SkillLongForm } from "@actor/types.ts";
import type { ConsumablePF2e, MeleePF2e, WeaponPF2e } from "@item";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { MigrationRecord, Rarity, Size, ValueAndMaybeMax, ZeroToTwo } from "@module/data.ts";
import type { AutoChangeEntry } from "@module/rules/rule-element/ae-like.ts";
import type { AttackRollParams, DamageRollParams, RollParameters } from "@module/system/rolls.ts";
import type { CheckRoll } from "@system/check/roll.ts";
import type { DamageRoll } from "@system/damage/roll.ts";
import type { StatisticTraceData } from "@system/statistic/data.ts";
import type { Immunity, ImmunitySource, Resistance, ResistanceSource, Weakness, WeaknessSource } from "./iwr.ts";
import type { ActorSizePF2e } from "./size.ts";

/** Base interface for all actor data */
type BaseActorSourcePF2e<
    TType extends ActorType,
    TSystemSource extends ActorSystemSource = ActorSystemSource,
> = foundry.documents.ActorSource<TType, TSystemSource, ItemSourcePF2e> & {
    flags: DeepPartial<ActorFlagsPF2e>;
    prototypeToken: PrototypeTokenSourcePF2e;
};

type ActorFlagsPF2e = foundry.documents.ActorFlags & {
    pf2e: {
        rollOptions: RollOptionFlags;
        /** IDs of granted items that are tracked */
        trackedItems: Record<string, string>;
        [key: string]: unknown;
    };
};

type ActorSystemSource = {
    details?: ActorDetailsSource;
    attributes: ActorAttributesSource;
    traits?: ActorTraitsSource<string>;

    /** A record of this actor's current world schema version as well a log of the last migration to occur */
    _migration: MigrationRecord;
    /** Legacy location of `MigrationRecord` */
    schema?: Readonly<{ version: number | null; lastMigration: object | null }>;
};

interface ActorAttributesSource {
    hp?: ActorHitPointsSource;
    immunities?: ImmunitySource[];
    weaknesses?: WeaknessSource[];
    resistances?: ResistanceSource[];
}

interface ActorHitPointsSource extends ValueAndMaybeMax {
    temp?: number;
}

interface ActorDetailsSource {
    /** The level of this actor */
    level?: { value: number };
    /** The alliance this NPC belongs to: relevant to mechanics like flanking */
    alliance?: ActorAlliance;
}

interface ActorSystemData extends ActorSystemSource {
    abilities?: Abilities;
    details: ActorDetails;
    actions?: StrikeData[];
    attributes: ActorAttributes;
    traits?: ActorTraitsData<string>;

    /** Initiative, used to determine turn order in encounters */
    initiative?: InitiativeTraceData;

    /** An audit log of automatic, non-modifier changes applied to various actor data nodes */
    autoChanges: Record<string, AutoChangeEntry[] | undefined>;
}

interface ActorAttributes extends ActorAttributesSource {
    hp?: ActorHitPoints;
    ac?: { value: number };
    immunities: Immunity[];
    weaknesses: Weakness[];
    resistances: Resistance[];
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
        /** Given the actor is flankable, whether it is off-guard when flanked */
        offGuardable: OffGuardableCircumstance;
    };
}

interface ActorHitPoints extends Required<BaseHitPointsSource> {
    unrecoverable: number;
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

type OffGuardableCircumstance =
    /** Flat-footable in all flanking situations */
    | true
    /** Flat-footable if the flanker's level is less than or equal to the actor's own */
    | number
    /** Never off-guardable */
    | false;

type GangUpCircumstance =
    /** Requires at least `number` allies within melee reach of the target */
    | number
    /** Requires the actor's animal companion to be adjacent to the target */
    | "animal-companion"
    /** The Gang Up rogue feat allows allies to flank with the gang-upper */
    | true;

/** Data related to actor hitpoints. */
// expose _modifiers field to allow initialization in data preparation
type HitPointsStatistic = StatisticModifier & ActorHitPoints;

interface ActorTraitsSource<TTrait extends string> {
    /** Actual Pathfinder traits */
    value: TTrait[];
    /** The rarity of the actor */
    rarity?: Rarity;
    /** The actor's size category */
    size?: { value: Size };
}

interface ActorTraitsData<TTrait extends string> extends ActorTraitsSource<TTrait> {
    size?: ActorSizePF2e;
}

/** Basic skill and save data (not including custom modifiers). */
interface AttributeBasedTraceData extends StatisticTraceData {
    attribute: AttributeString;
    /** The actual modifier for this martial type */
    value: number;
    /** Describes how the value was computed */
    breakdown: string;
}

/** A roll function which can be called to roll a given skill. */
type RollFunction<T extends RollParameters = RollParameters> = (
    params: T,
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

/** The full data for creature or hazard AC; includes the armor check penalty. */
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
    /** The glyph for this strike (how many actions it takes, reaction, etc). */
    glyph: string;
    /** A description of this strike. */
    description: string;
    /** A description of what happens on a critical success. */
    criticalSuccess: string;
    /** A description of what happens on a success. */
    success: string;
    /** Action traits associated with this strike */
    traits: TraitViewData[];
    /** Any options always applied to this strike */
    options: string[];
    /** Whether the strike is ready (usually when the weapon corresponding with the strike is equipped) */
    ready: boolean;
    /** Alias for `attack`. */
    roll?: RollFunction<AttackRollParams>;
    /** Roll to attack with the given strike (with no MAP; see `variants` for MAPs.) */
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
        compatible: (ConsumablePF2e<ActorPF2e> | WeaponPF2e<ActorPF2e>)[];
        incompatible: (ConsumablePF2e<ActorPF2e> | WeaponPF2e<ActorPF2e>)[];
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

type PrototypeTokenSourcePF2e = foundry.data.PrototypeTokenSource & {
    flags: {
        pf2e?: {
            linkToActorSize?: boolean;
            autoscale?: boolean;
        };
    };
};

interface PrototypeTokenPF2e<TParent extends ActorPF2e | null> extends foundry.data.PrototypeToken<TParent> {
    flags: DocumentFlags & {
        pf2e: {
            linkToActorSize: boolean;
            autoscale: boolean;
        };
    };
}

export type {
    ActorAttributes,
    ActorAttributesSource,
    ActorDetails,
    ActorDetailsSource,
    ActorFlagsPF2e,
    ActorHitPoints,
    ActorHitPointsSource,
    ActorSystemData,
    ActorSystemSource,
    ActorTraitsData,
    ActorTraitsSource,
    ArmorClassData,
    AttributeBasedTraceData,
    BaseActorSourcePF2e,
    BaseHitPointsSource,
    DamageRollFunction,
    GangUpCircumstance,
    HitPointsStatistic,
    InitiativeData,
    PrototypeTokenPF2e,
    RollFunction,
    RollOptionFlags,
    Rollable,
    StrikeData,
    TraitViewData,
};
