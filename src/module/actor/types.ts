import type * as ActorInstance from "@actor";
import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import { EffectTrait } from "@item/abstract-effect/index.ts";
import { ItemInstances } from "@item/types.ts";
import type { TokenPF2e } from "@module/canvas/index.ts";
import { CheckRollContextFlag } from "@module/chat-message/index.ts";
import type { ItemAlteration } from "@module/rules/rule-element/item-alteration/alteration.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr.ts";
import type { DamageRoll } from "@system/damage/roll.ts";
import { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import type { PredicatePF2e } from "@system/predication.ts";
import type { StatisticCheck } from "@system/statistic/index.ts";
import { StrikeData, TraitViewData } from "./data/base.ts";
import type { ModifierPF2e } from "./modifiers.ts";
import type {
    ATTRIBUTE_ABBREVIATIONS,
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
type AttributeString = SetElement<typeof ATTRIBUTE_ABBREVIATIONS>;

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
    traits: EffectTrait[];
    effects: AuraEffectData[];
    appearance: AuraAppearanceData;
}

interface AuraEffectData {
    uuid: string;
    affects: "allies" | "enemies" | "all";
    events: ("enter" | "turn-start" | "turn-end")[];
    save: {
        type: SaveType;
        dc: number;
    } | null;
    predicate: PredicatePF2e;
    removeOnExit: boolean;
    includesSelf: boolean;
    alterations: ItemAlteration[];
}

interface AuraAppearanceData {
    border: { color: number; alpha: number } | null;
    highlight: { color: number; alpha: number };
    texture: {
        src: ImageFilePath | VideoFilePath;
        alpha: number;
        scale: number;
        translation: { x: number; y: number } | null;
        loop: boolean;
        playbackRate: number;
    } | null;
}

/* -------------------------------------------- */
/*  Attack Rolls                                */
/* -------------------------------------------- */

interface StrikeSelf<
    TActor extends ActorPF2e = ActorPF2e,
    TStatistic extends StatisticCheck | StrikeData | null = StatisticCheck | StrikeData | null,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
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
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> {
    /** Roll options */
    options: Set<string>;
    self: StrikeSelf<TActor, TStatistic, TItem>;
    target: RollTarget | null;
    traits: TraitViewData[];
}

interface RollContextParams<
    TStatistic extends StatisticCheck | StrikeData | null = StatisticCheck | StrikeData | null,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
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
    /** A direct way of informing a check is part of a melee action: it is otherwise inferred from the attack item */
    melee?: boolean;
}

interface CheckContextParams<
    TStatistic extends StatisticCheck | StrikeData = StatisticCheck | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> extends RollContextParams<TStatistic, TItem> {
    defense: string;
}

interface DamageRollContextParams<
    TStatistic extends StatisticCheck | StrikeData | null = StatisticCheck | StrikeData | null,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> extends RollContextParams<TStatistic, TItem> {
    /** The context object of the preceding check roll */
    checkContext: Maybe<CheckRollContextFlag>;
    /**
     * An outcome of a preceding check roll:
     * This may be different than what is in the context object if the user rolled damage despite a failure
     */
    outcome: Maybe<DegreeOfSuccessString>;
}

interface CheckContext<
    TActor extends ActorPF2e,
    TStatistic extends StatisticCheck | StrikeData = StatisticCheck | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
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

export type {
    ActorAlliance,
    ActorDimensions,
    ActorInstances,
    ApplyDamageParams,
    AttributeString,
    AuraAppearanceData,
    AuraData,
    AuraEffectData,
    CheckContext,
    CheckContextParams,
    DCSlug,
    DamageRollContextParams,
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
