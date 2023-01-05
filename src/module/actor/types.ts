import { ActorPF2e } from "@actor";
import { MeleePF2e, SpellPF2e, WeaponPF2e } from "@item";
import { ItemTrait } from "@item/data/base";
import { TokenDocumentPF2e } from "@scene";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr";
import { DamageRoll } from "@system/damage/roll";
import { CheckDC } from "@system/degree-of-success";
import { TraitViewData } from "./data/base";
import { ModifierPF2e } from "./modifiers";
import { ABILITY_ABBREVIATIONS, DC_SLUGS, SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_LONG_FORMS } from "./values";

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

type SaveType = typeof SAVE_TYPES[number];

interface AuraData {
    slug: string;
    radius: number;
    effects: AuraEffectData[];
    colors: AuraColors | null;
    traits: ItemTrait[];
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
    removeOnExit: boolean;
}

interface AuraColors {
    border: `#${string}`;
    fill: `#${string}`;
}

/* -------------------------------------------- */
/*  Attack Rolls                                */
/* -------------------------------------------- */

type AttackItem = WeaponPF2e | MeleePF2e | SpellPF2e;

interface StrikeSelf<A extends ActorPF2e = ActorPF2e, I extends AttackItem = AttackItem> {
    actor: A;
    token: TokenDocumentPF2e | null;
    /** The item used for the strike */
    item: I;
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
interface StrikeRollContext<A extends ActorPF2e, I extends AttackItem> {
    /** Roll options */
    options: Set<string>;
    self: StrikeSelf<A, I>;
    target: AttackTarget | null;
    traits: TraitViewData[];
}

interface StrikeRollContextParams<T extends AttackItem> {
    item: T;
    /** Domains from which to draw roll options */
    domains: string[];
    /** Initial roll options for the strike */
    options: Set<string>;
    /** Whether the request is for display in a sheet view. If so, targets are not considered */
    viewOnly?: boolean;
}

interface AttackRollContext<A extends ActorPF2e, I extends AttackItem> extends StrikeRollContext<A, I> {
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
type IWRType = ImmunityType | WeaknessType | ResistanceType;

export {
    AbilityString,
    ActorAlliance,
    ActorDimensions,
    ApplyDamageParams,
    AttackItem,
    AttackRollContext,
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
    WeaknessType,
};
