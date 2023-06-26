import * as ActorInstance from "@actor";
import * as ItemInstance from "@item";
import { EffectTrait } from "@item/abstract-effect/index.ts";
import { ItemInstances } from "@item/types.ts";
import { TokenPF2e } from "@module/canvas/index.ts";
import { ActorPF2e, ItemPF2e } from "@module/documents.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { StatisticCheck } from "@system/statistic/index.ts";
import { StrikeData, TraitViewData } from "./data/base.ts";
import { ModifierPF2e } from "./modifiers.ts";
import {
    ABILITY_ABBREVIATIONS,
    DC_SLUGS,
    MOVEMENT_TYPES,
    SAVE_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_LONG_FORMS,
    UNAFFECTED_TYPES,
} from "./values.ts";

/** Used exclusively to resolve `ActorPF2e#isOfType` */
interface ActorInstances<TParent extends TokenDocumentPF2e | null> {
    character: ActorInstance.CharacterPF2e<TParent>;
    creature: ActorInstance.CreaturePF2e<TParent>;
    familiar: ActorInstance.FamiliarPF2e<TParent>;
    hazard: ActorInstance.HazardPF2e<TParent>;
    loot: ActorInstance.LootPF2e<TParent>;
    party: ActorInstance.PartyPF2e<TParent>;
    npc: ActorInstance.NPCPF2e<TParent>;
    vehicle: ActorInstance.VehiclePF2e<TParent>;
}

type EmbeddedItemInstances<TParent extends ActorPF2e> = {
    [K in keyof ItemInstances<TParent>]: ItemInstances<TParent>[K][];
};
type AbilityString = SetElement<typeof ABILITY_ABBREVIATIONS>;

interface ActorDimensions {
    length: number;
    width: number;
    height: number;
}

type SkillAbbreviation = SetElement<typeof SKILL_ABBREVIATIONS>;
type SkillLongForm = SetElement<typeof SKILL_LONG_FORMS>;

type ActorAlliance = "party" | "opposition" | null;

type DCSlug = SetElement<typeof DC_SLUGS>;

type SaveType = (typeof SAVE_TYPES)[number];

type MovementType = (typeof MOVEMENT_TYPES)[number];

interface AuraData {
    slug: string;
    level: number | null;
    radius: number;
    effects: AuraEffectData[];
    colors: AuraColors | null;
    traits: EffectTrait[];
}

interface AuraEffectData {
    uuid: string;
    level: number | null;
    affects: "allies" | "enemies" | "all";
    events: ("enter" | "turn-start" | "turn-end")[];
    save: {
        type: SaveType;
        dc: number;
    } | null;
    predicate: PredicatePF2e;
    removeOnExit: boolean;
    includesSelf: boolean;
}

interface AuraColors {
    border: `#${string}` | null;
    fill: `#${string}` | null;
}

/* -------------------------------------------- */
/*  Attack Rolls                                */
/* -------------------------------------------- */

type AttackItem =
    | ItemInstance.WeaponPF2e<ActorPF2e>
    | ItemInstance.MeleePF2e<ActorPF2e>
    | ItemInstance.SpellPF2e<ActorPF2e>;

interface StrikeSelf<
    TActor extends ActorPF2e = ActorPF2e,
    TStatistic extends StatisticCheck | StrikeData | null = StatisticCheck | StrikeData | null,
    TItem extends AttackItem | null = AttackItem | null
> {
    actor: TActor;
    token: TokenDocumentPF2e | null;
    /** The Strike statistic in use */
    statistic: TStatistic;
    /** The item used for the strike */
    item: TItem;
    /** Bonuses and penalties added at the time of a strike */
    modifiers: ModifierPF2e[];
}

interface RollTarget {
    actor: ActorPF2e;
    token: TokenDocumentPF2e;
    distance: number;
    rangeIncrement: number | null;
}

/** Context for the attack or damage roll of a strike */
interface RollContext<
    TActor extends ActorPF2e,
    TStatistic extends StatisticCheck | StrikeData | null = StatisticCheck | StrikeData | null,
    TItem extends AttackItem | null = AttackItem | null
> {
    /** Roll options */
    options: Set<string>;
    self: StrikeSelf<TActor, TStatistic, TItem>;
    target: RollTarget | null;
    traits: TraitViewData[];
}

interface RollContextParams<
    TStatistic extends StatisticCheck | StrikeData | null = StatisticCheck | StrikeData | null,
    TItem extends AttackItem | null = AttackItem | null
> {
    /** The statistic used for the roll */
    statistic: TStatistic;
    /** A targeted token: may not be applicable if the action isn't targeted */
    target?: { actor?: ActorPF2e | null; token?: TokenPF2e | null } | null;
    /** The item being used in the attack or damage roll */
    item?: TItem;
    /** Domains from which to draw roll options */
    domains: string[];
    /** Initial roll options for the strike */
    options: Set<string>;
    /** Whether the request is for display in a sheet view. If so, targets are not considered */
    viewOnly?: boolean;
}

interface CheckContextParams<
    TStatistic extends StatisticCheck | StrikeData = StatisticCheck | StrikeData,
    TItem extends AttackItem | null = AttackItem | null
> extends RollContextParams<TStatistic, TItem> {
    targetedDC: DCSlug;
}

interface CheckContext<
    TActor extends ActorPF2e,
    TStatistic extends StatisticCheck | StrikeData = StatisticCheck | StrikeData,
    TItem extends AttackItem | null = AttackItem | null
> extends RollContext<TActor, TStatistic, TItem> {
    dc: CheckDC | null;
}

interface ApplyDamageParams {
    damage: number | Rolled<DamageRoll>;
    token: TokenDocumentPF2e;
    /** The item used in the damaging action */
    item?: ItemPF2e<ActorPF2e> | null;
    skipIWR?: boolean;
    /** Predicate statements from the damage roll */
    rollOptions?: Set<string>;
    shieldBlockRequest?: boolean;
    breakdown?: string[];
    notes?: string[];
}

type ImmunityType = keyof typeof immunityTypes;
type WeaknessType = keyof typeof weaknessTypes;
type ResistanceType = keyof typeof resistanceTypes;
/** Damage types a creature or hazard is possibly unaffected by, outside the IWR framework */
type UnaffectedType = SetElement<typeof UNAFFECTED_TYPES>;
type IWRType = ImmunityType | WeaknessType | ResistanceType;

export {
    AbilityString,
    ActorAlliance,
    ActorDimensions,
    ActorInstances,
    ApplyDamageParams,
    AttackItem,
    AuraColors,
    AuraData,
    AuraEffectData,
    CheckContext,
    CheckContextParams,
    DCSlug,
    EmbeddedItemInstances,
    IWRType,
    ImmunityType,
    MovementType,
    ResistanceType,
    RollContext,
    RollContextParams,
    RollTarget,
    SaveType,
    SkillAbbreviation,
    SkillLongForm,
    StrikeSelf,
    UnaffectedType,
    WeaknessType,
};
