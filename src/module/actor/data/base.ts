import type { ActorPF2e, ActorType } from "@actor";
import type { DexterityModifierCapData } from "@actor/character/types.ts";
import type { Abilities } from "@actor/creature/data.ts";
import type { InitiativeTraceData } from "@actor/initiative.ts";
import type { Modifier, StatisticModifier } from "@actor/modifiers.ts";
import type { ActorAlliance, AttributeString, SkillSlug } from "@actor/types.ts";
import type { Rolled } from "@client/dice/roll.d.mts";
import type { ImageFilePath } from "@common/constants.mjs";
import type { DocumentFlags, DocumentFlagsSource } from "@common/data/_module.d.mts";
import type { MeleePF2e, WeaponPF2e } from "@item";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { MigrationRecord, Rarity, Size, ValueAndMaybeMax, ZeroToTwo } from "@module/data.ts";
import type { AutoChangeEntry } from "@module/rules/rule-element/ae-like.ts";
import type { AttackRollParams, DamageRollParams, RollParameters } from "@module/system/rolls.ts";
import type { CheckRoll } from "@system/check/roll.ts";
import type { DamageRoll } from "@system/damage/roll.ts";
import type { StatisticTraceData } from "@system/statistic/data.ts";
import type { Statistic } from "@system/statistic/statistic.ts";
import type { Immunity, ImmunitySource, Resistance, ResistanceSource, Weakness, WeaknessSource } from "./iwr.ts";
import type { ActorSizePF2e } from "./size.ts";

/** Base interface for all actor data */
type BaseActorSourcePF2e<
    TType extends ActorType,
    TSystemSource extends ActorSystemSource = ActorSystemSource,
> = foundry.documents.ActorSource<TType, TSystemSource, ItemSourcePF2e> & {
    flags: ActorSourceFlagsPF2e;
    prototypeToken: PrototypeTokenSourcePF2e;
};

type ActorSourceFlagsPF2e = DocumentFlagsSource & { pf2e?: Partial<ActorFlagsPF2eSystemProps> };
type ActorFlagsPF2e = DocumentFlags & { pf2e: ActorFlagsPF2eSystemProps };

interface ActorFlagsPF2eSystemProps {
    rollOptions: RollOptionFlags;
    /** IDs of granted items that are tracked */
    trackedItems: Record<string, string>;
    hideStowed?: boolean;
    [key: string]: unknown;
}

type ActorSystemSource = {
    details?: ActorDetailsSource;
    attributes?: ActorAttributesSource;
    traits?: ActorTraitsSource<string>;

    /** A record of this actor's current world schema version as well a log of the last migration to occur */
    _migration: MigrationRecord;
    /** Legacy location of `MigrationRecord` */
    schema?: object;
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
    actions?: AttackAction[];
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
        itemId: string | null;
    };
    flanking: FlankingData;
}

interface FlankingData {
    /** Whether the actor can flank at all */
    canFlank: boolean;
    /** Given the actor can flank, the conditions under which it can do so without an ally opposite the target */
    canGangUp: GangUpCircumstance[];
    /** Whether the actor can be flanked at all */
    flankable: boolean;
    /** Given the actor is flankable, whether it is off-guard when flanked */
    offGuardable: OffGuardableCircumstance;
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
    /** Requires the actor's eidolon to be adjacent to the target */
    | "eidolon"
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
    statistic: SkillSlug | "perception";
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
    description: string | null;
}

interface BasicAttackAction {
    slug: string;
    label: string;
    type: string;
    /** Action traits associated with this action */
    traits: TraitViewData[];
    /** The glyph for this attack (how many actions it takes, reaction, etc). */
    glyph: string;
    /** A description of this attack. */
    description: string;
    /**
     * Whether the strike and its auxiliary actions are available (usually when the weapon corresponding with the
     * strike is equipped)
     */
    ready: boolean;
    /** Whether striking itself, independent of the auxiliary actions, is possible */
    canAttack: boolean;
    /** The weapon or melee item--possibly ephemeral--being used for the strike */
    item: WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>;
    altUsages?: AttackAction[];
    /** Roll normal (non-critical) damage for this weapon. */
    damage?: DamageRollFunction;
    /** Roll critical damage for this weapon. */
    critical?: DamageRollFunction;
    readonly modifiers: Modifier[];
    /** Ammunition choices and selected ammo if this is a ammo consuming weapon. */
    ammunition?: AttackAmmunitionData | null;
}

interface AttackAmmunitionData {
    compatible: { id: string; label: string }[];
    loaded: { id: string; img: ImageFilePath; name: string; quantity: number; max: number; isTemporary: boolean }[];
    selected: {
        id: string;
        compatible: boolean;
    } | null;
    requiresReload: boolean;
    reloadGlyph: string | null;
    capacity: number;
    remaining: number;
}

/** An strike which an actor can use. */
interface StrikeData extends StatisticModifier, BasicAttackAction {
    label: string;
    /** The type of action; currently just 'strike'. */
    type: "strike";
    /** Any options always applied to this strike */
    options: string[];
    /** Alias for `attack`. */
    roll?: RollFunction<AttackRollParams>;
    /** Roll to attack with the given strike (with no MAP; see `variants` for MAPs.) */
    attack?: RollFunction<AttackRollParams>;
    /** Alternative usages of a strike weapon: thrown, combination-melee, etc. */
    altUsages?: AttackAction[];
    /** A list of attack variants which apply the Multiple Attack Penalty. */
    variants: { label: string; roll: RollFunction<AttackRollParams> }[];
}

interface AreaAttack extends BasicAttackAction {
    type: "area-fire" | "auto-fire";
    item: MeleePF2e<ActorPF2e> | WeaponPF2e<ActorPF2e>;
    /** The type of attack as a localization string */
    attackRollType: string;
    statistic: Statistic;
    /** A list of buttons to show. In practice there is only one */
    variants: { label: string; roll: () => void }[];
}

type AttackAction = StrikeData | AreaAttack;

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
    AreaAttack,
    ArmorClassData,
    AttackAction,
    AttackAmmunitionData,
    AttributeBasedTraceData,
    BaseActorSourcePF2e,
    BaseHitPointsSource,
    BasicAttackAction,
    DamageRollFunction,
    FlankingData,
    GangUpCircumstance,
    HitPointsStatistic,
    InitiativeData,
    PrototypeTokenPF2e,
    Rollable,
    RollFunction,
    RollOptionFlags,
    StrikeData,
    TraitViewData,
};
