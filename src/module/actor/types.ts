import { ActorPF2e } from "@actor";
import { MeleePF2e, SpellPF2e, WeaponPF2e } from "@item";
import { EffectTrait } from "@item/abstract-effect";
import { TokenDocumentPF2e } from "@scene";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr";
import { DamageRoll } from "@system/damage/roll";
import { CheckDC } from "@system/degree-of-success";
import { PredicatePF2e } from "@system/predication";
import { TraitViewData } from "./data/base";
import { ModifierPF2e, StatisticModifier } from "./modifiers";
import {
    ABILITY_ABBREVIATIONS,
    DC_SLUGS,
    SAVE_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_LONG_FORMS,
    UNAFFECTED_TYPES,
} from "./values";
import { StatisticCheck } from "@system/statistic";

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
    border: `#${string}`;
    fill: `#${string}`;
}

/* -------------------------------------------- */
/*  Attack Rolls                                */
/* -------------------------------------------- */

type AttackItem = WeaponPF2e | MeleePF2e | SpellPF2e;

interface StrikeSelf<
    TActor extends ActorPF2e = ActorPF2e,
    TStatistic extends StatisticCheck | StatisticModifier | null = StatisticCheck | StatisticModifier | null,
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

interface AttackTarget {
    actor: ActorPF2e;
    token: TokenDocumentPF2e;
    distance: number;
    rangeIncrement: number | null;
}

/** Context for the attack or damage roll of a strike */
interface StrikeRollContext<
    TActor extends ActorPF2e,
    TStatistic extends StatisticCheck | StatisticModifier | null = StatisticCheck | StatisticModifier | null,
    TItem extends AttackItem | null = AttackItem | null
> {
    /** Roll options */
    options: Set<string>;
    self: StrikeSelf<TActor, TStatistic, TItem>;
    target: AttackTarget | null;
    traits: TraitViewData[];
}

interface StrikeRollContextParams<
    TStatistic extends StatisticCheck | StatisticModifier | null = StatisticCheck | StatisticModifier | null,
    TItem extends AttackItem | null = AttackItem | null
> {
    /** The statistic used for the roll */
    statistic: TStatistic;
    /** The item being used in the attack or damage roll */
    item?: TItem;
    /** Domains from which to draw roll options */
    domains: string[];
    /** Initial roll options for the strike */
    options: Set<string>;
    /** Whether the request is for display in a sheet view. If so, targets are not considered */
    viewOnly?: boolean;
}

type AttackRollContextParams<
    TStatistic extends StatisticCheck | StatisticModifier = StatisticCheck | StatisticModifier,
    TItem extends AttackItem | null = AttackItem | null
> = StrikeRollContextParams<TStatistic, TItem>;

interface AttackRollContext<
    TActor extends ActorPF2e,
    TStatistic extends StatisticCheck | StatisticModifier = StatisticCheck | StatisticModifier,
    TItem extends AttackItem | null = AttackItem | null
> extends StrikeRollContext<TActor, TStatistic, TItem> {
    dc: CheckDC | null;
}

interface ApplyDamageParams {
    damage: number | Rolled<DamageRoll>;
    token: TokenDocumentPF2e;
    skipIWR?: boolean;
    /** Predicate statements from the damage roll */
    rollOptions?: Set<string>;
    shieldBlockRequest?: boolean;
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
    ApplyDamageParams,
    AttackItem,
    AttackRollContext,
    AttackRollContextParams,
    AttackTarget,
    AuraColors,
    AuraData,
    AuraEffectData,
    DCSlug,
    IWRType,
    ImmunityType,
    ResistanceType,
    SaveType,
    SkillAbbreviation,
    SkillLongForm,
    StrikeRollContext,
    StrikeRollContextParams,
    StrikeSelf,
    UnaffectedType,
    WeaknessType,
};
