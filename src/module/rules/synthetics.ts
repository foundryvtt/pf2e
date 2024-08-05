import type { ActorPF2e } from "@actor";
import type { DexterityModifierCapData } from "@actor/character/types.ts";
import type { LabeledSpeed, SenseData } from "@actor/creature/data.ts";
import type {
    DamageDicePF2e,
    DeferredDamageDiceOptions,
    DeferredPromise,
    DeferredValue,
    ModifierAdjustment,
    ModifierPF2e,
} from "@actor/modifiers.ts";
import type { MovementType } from "@actor/types.ts";
import type { MeleePF2e, WeaponPF2e } from "@item";
import type { ActionTrait } from "@item/ability/index.ts";
import type { ConditionSource, EffectSource } from "@item/base/data/index.ts";
import type { WeaponRuneSource } from "@item/weapon/data.ts";
import type { WeaponPropertyRuneType } from "@item/weapon/types.ts";
import type { ActiveEffectPF2e } from "@module/active-effect.ts";
import type { RollNotePF2e } from "@module/notes.ts";
import type { MaterialDamageEffect } from "@system/damage/types.ts";
import type { DegreeOfSuccessAdjustment } from "@system/degree-of-success.ts";
import type { Predicate } from "@system/predication.ts";
import type { Statistic } from "@system/statistic/index.ts";
import type { TokenSource } from "types/foundry/common/documents/token.d.ts";
import type { DamageAlteration } from "./rule-element/damage-alteration/alteration.ts";
import type { Suboption } from "./rule-element/roll-option/data.ts";

/** Defines a list of data provided by rule elements that an actor can pull from during its data preparation lifecycle */
interface RuleElementSynthetics<TActor extends ActorPF2e = ActorPF2e> {
    criticalSpecializations: {
        standard: CritSpecSynthetic[];
        alternate: CritSpecSynthetic[];
    };
    damageAlterations: Record<string, DamageAlteration[]>;
    damageDice: DamageDiceSynthetics;
    degreeOfSuccessAdjustments: Record<string, DegreeOfSuccessAdjustment[]>;
    dexterityModifierCaps: DexterityModifierCapData[];
    ephemeralEffects: Record<
        string,
        { target: DeferredEphemeralEffect[]; origin: DeferredEphemeralEffect[] } | undefined
    >;
    modifierAdjustments: ModifierAdjustmentSynthetics;
    modifiers: ModifierSynthetics;
    movementTypes: { [K in MovementType]?: DeferredMovementType[] };
    multipleAttackPenalties: Record<string, MAPSynthetic[]>;
    rollNotes: Record<string, RollNotePF2e[]>;
    rollSubstitutions: Record<string, RollSubstitution[]>;
    rollTwice: Record<string, RollTwiceSynthetic[]>;
    senses: SenseSynthetic[];
    statistics: Map<string, Statistic>;
    strikeAdjustments: StrikeAdjustment[];
    strikes: DeferredStrike[];
    striking: Record<string, StrikingSynthetic[]>;
    toggles: Record<string, Record<string, RollOptionToggle>>;
    tokenEffectIcons: ActiveEffectPF2e<TActor>[];
    tokenMarks: Map<TokenDocumentUUID, string>;
    tokenOverrides: DeepPartial<Pick<TokenSource, "light" | "name">> & {
        alpha?: number | null;
        texture?:
            | { src: VideoFilePath; tint?: Color | null }
            | { src: VideoFilePath; tint?: Color | null; scaleX: number; scaleY: number };
        animation?: TokenAnimationOptions;
    };
    weaponPotency: Record<string, PotencySynthetic[]>;
}

type CritSpecEffect = (DamageDicePF2e | ModifierPF2e | RollNotePF2e)[];
type CritSpecSynthetic = (weapon: WeaponPF2e | MeleePF2e, options: Set<string>) => CritSpecEffect | null;

type DamageDiceSynthetics = { damage: DeferredDamageDice[] } & Record<string, DeferredDamageDice[] | undefined>;
type ModifierSynthetics = Record<"all" | "damage", DeferredModifier[]> & Record<string, DeferredModifier[] | undefined>;
type ModifierAdjustmentSynthetics = { all: ModifierAdjustment[]; damage: ModifierAdjustment[] } & Record<
    string,
    ModifierAdjustment[] | undefined
>;
type DeferredModifier = DeferredValue<ModifierPF2e>;
type DeferredDamageDice = (args: DeferredDamageDiceOptions) => DamageDicePF2e | null;
type DeferredMovementType = DeferredValue<BaseSpeedSynthetic | null>;
type DeferredEphemeralEffect = DeferredPromise<EffectSource | ConditionSource | null>;
type DeferredStrike = (runes?: WeaponRuneSource) => WeaponPF2e<ActorPF2e> | null;

interface BaseSpeedSynthetic extends Omit<LabeledSpeed, "label" | "type"> {
    type: MovementType;
    /**
     * Whether this speed is derived from a creature's land speed:
     * used as a cue to prevent double-application of modifiers
     */
    derivedFromLand: boolean;
}

interface MAPSynthetic {
    label: string;
    penalty: number;
    predicate: Predicate;
}

interface RollSubstitution {
    slug: string;
    label: string;
    predicate: Predicate;
    value: number;
    required: boolean;
    selected: boolean;
    effectType: "fortune" | "misfortune";
}

interface RollOptionToggle {
    /** The ID of the item with a rule element for this toggle */
    itemId: string;
    label: string;
    placement: string;
    domain: string;
    option: string;
    suboptions: Suboption[];
    alwaysActive: boolean;
    checked: boolean;
    enabled: boolean;
}

interface RollTwiceSynthetic {
    keep: "higher" | "lower";
    predicate: Predicate;
}

interface SenseSynthetic {
    sense: Required<SenseData>;
    predicate: Predicate;
    force: boolean;
}

interface StrikeAdjustment {
    adjustDamageRoll?: (
        weapon: WeaponPF2e | MeleePF2e,
        { materials }: { materials?: Set<MaterialDamageEffect> },
    ) => void;
    adjustWeapon?: (weapon: WeaponPF2e | MeleePF2e) => void;
    adjustTraits?: (weapon: WeaponPF2e | MeleePF2e, traits: ActionTrait[]) => void;
}

interface StrikingSynthetic {
    label: string;
    bonus: number;
    predicate: Predicate;
}

interface PotencySynthetic {
    label: string;
    bonus: number;
    type: "item" | "potency";
    predicate: Predicate;
    property?: WeaponPropertyRuneType[];
}

export type {
    BaseSpeedSynthetic,
    CritSpecEffect,
    DamageDiceSynthetics,
    DeferredDamageDice,
    DeferredEphemeralEffect,
    DeferredModifier,
    DeferredMovementType,
    MAPSynthetic,
    ModifierAdjustmentSynthetics,
    ModifierSynthetics,
    PotencySynthetic,
    RollOptionToggle,
    RollSubstitution,
    RollTwiceSynthetic,
    RuleElementSynthetics,
    SenseSynthetic,
    StrikeAdjustment,
    StrikingSynthetic,
};
