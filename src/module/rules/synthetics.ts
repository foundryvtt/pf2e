import { ActorPF2e } from "@actor";
import { DexterityModifierCapData } from "@actor/character/types.ts";
import { LabeledSpeed } from "@actor/creature/data.ts";
import { CreatureSensePF2e } from "@actor/creature/sense.ts";
import { DamageDicePF2e, DeferredPromise, DeferredValue, ModifierAdjustment, ModifierPF2e } from "@actor/modifiers.ts";
import type { TokenEffect } from "@actor/token-effect.ts";
import { MovementType } from "@actor/types.ts";
import { MeleePF2e, WeaponPF2e } from "@item";
import { ActionTrait } from "@item/ability/index.ts";
import { ConditionSource, EffectSource } from "@item/base/data/index.ts";
import { WeaponPropertyRuneType } from "@item/weapon/types.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { MaterialDamageEffect } from "@system/damage/types.ts";
import { DegreeOfSuccessAdjustment } from "@system/degree-of-success.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { Statistic } from "@system/statistic/index.ts";

/** Defines a list of data provided by rule elements that an actor can pull from during its data preparation lifecycle */
interface RuleElementSynthetics {
    criticalSpecalizations: {
        standard: CritSpecSynthetic[];
        alternate: CritSpecSynthetic[];
    };
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
    strikes: Map<string, WeaponPF2e<ActorPF2e>>;
    striking: Record<string, StrikingSynthetic[]>;
    toggles: RollOptionToggle[];
    tokenEffectIcons: TokenEffect[];
    tokenMarks: Map<TokenDocumentUUID, string>;
    tokenOverrides: DeepPartial<Pick<foundry.documents.TokenSource, "light" | "name" | "alpha">> & {
        texture?:
            | { src: VideoFilePath; tint?: HexColorString }
            | { src: VideoFilePath; tint?: HexColorString; scaleX: number; scaleY: number };
    };
    weaponPotency: Record<string, PotencySynthetic[]>;
    preparationWarnings: {
        /** Adds a new preparation warning to be printed when flushed. These warnings are de-duped. */
        add: (warning: string) => void;
        /** Prints all preparation warnings, but this printout is debounced to handle prep and off-prep cycles */
        flush: () => void;
    };
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
type DeferredDamageDice = DeferredValue<DamageDicePF2e>;
type DeferredMovementType = DeferredValue<BaseSpeedSynthetic | null>;
type DeferredEphemeralEffect = DeferredPromise<EffectSource | ConditionSource | null>;

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
    predicate?: PredicatePF2e;
}

interface RollSubstitution {
    slug: string;
    label: string;
    predicate: PredicatePF2e;
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
    suboptions: { label: string; selected: boolean }[];
    alwaysActive: boolean;
    checked: boolean;
    enabled: boolean;
}

interface RollTwiceSynthetic {
    keep: "higher" | "lower";
    predicate?: PredicatePF2e;
}

interface SenseSynthetic {
    sense: CreatureSensePF2e;
    predicate: PredicatePF2e;
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
    predicate: PredicatePF2e;
}

interface PotencySynthetic {
    label: string;
    bonus: number;
    type: "item" | "potency";
    predicate: PredicatePF2e;
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
