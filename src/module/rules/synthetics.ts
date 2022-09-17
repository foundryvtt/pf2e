import { DexterityModifierCapData } from "@actor/character/types";
import { MovementType } from "@actor/creature/data";
import { CreatureSensePF2e } from "@actor/creature/sense";
import { DamageDicePF2e, DeferredValue, ModifierAdjustment, ModifierPF2e } from "@actor/modifiers";
import { MeleePF2e, WeaponPF2e } from "@item";
import { ActionTrait } from "@item/action/data";
import { WeaponMaterialEffect, WeaponPropertyRuneType } from "@item/weapon/types";
import { RollNotePF2e } from "@module/notes";
import { PredicatePF2e } from "@system/predication";

interface RuleElementSynthetics {
    criticalSpecalizations: {
        standard: CritSpecSynthetic[];
        alternate: CritSpecSynthetic[];
    };
    damageDice: Record<string, DeferredDamageDice[]>;
    dexterityModifierCaps: DexterityModifierCapData[];
    modifierAdjustments: Record<string, ModifierAdjustment[]>;
    movementTypes: { [K in BaseSpeedType]?: DeferredMovementType[] };
    multipleAttackPenalties: Record<string, MAPSynthetic[]>;
    rollNotes: Record<string, RollNotePF2e[]>;
    rollSubstitutions: Record<string, RollSubstitution[]>;
    rollTwice: Record<string, RollTwiceSynthetic[]>;
    senses: SenseSynthetic[];
    statisticsModifiers: Record<string, DeferredModifier[]>;
    strikeAdjustments: StrikeAdjustment[];
    strikes: Map<string, Embedded<WeaponPF2e>>;
    striking: Record<string, StrikingSynthetic[]>;
    tokenOverrides: DeepPartial<Pick<foundry.data.TokenSource, "light" | "name" | "texture">>;
    weaponPotency: Record<string, PotencySynthetic[]>;
    preparationWarnings: {
        /** Adds a new preparation warning to be printed when flushed */
        add: (warning: string) => void;
        /** Prints all preparation warnings, but this printout is debounced to handle prep and off-prep cycles */
        flush: () => void;
    };
}

type CritSpecSynthetic = (weapon: Embedded<WeaponPF2e>, options: Set<string>) => RollNotePF2e | null;

type DeferredModifier = DeferredValue<ModifierPF2e>;
type DeferredDamageDice = DeferredValue<DamageDicePF2e>;

type BaseSpeedType = Exclude<MovementType, "land">;
type DeferredMovementType = DeferredValue<{ type: BaseSpeedType; value: number } | null>;

interface MAPSynthetic {
    label: string;
    penalty: number;
    predicate?: PredicatePF2e;
}

interface RollSubstitution {
    slug: string;
    label: string;
    predicate: PredicatePF2e | null;
    value: number;
    ignored: boolean;
    effectType: "fortune" | "misfortune";
}

interface RollTwiceSynthetic {
    keep: "higher" | "lower";
    predicate?: PredicatePF2e;
}

interface SenseSynthetic {
    sense: CreatureSensePF2e;
    predicate: PredicatePF2e | null;
    force: boolean;
}

interface StrikeAdjustment {
    adjustDamageRoll?: (
        weapon: WeaponPF2e | MeleePF2e,
        { materials }: { materials?: Set<WeaponMaterialEffect> }
    ) => void;
    adjustWeapon?: (weapon: Embedded<WeaponPF2e>) => void;
    adjustTraits?: (weapon: WeaponPF2e | MeleePF2e, traits: ActionTrait[]) => void;
}

interface StrikingSynthetic {
    label: string;
    bonus: number;
    predicate?: PredicatePF2e;
}

interface PotencySynthetic {
    label: string;
    bonus: number;
    type: "item" | "potency";
    predicate?: PredicatePF2e;
    property?: WeaponPropertyRuneType[];
}

export {
    DeferredDamageDice,
    DeferredModifier,
    DeferredMovementType,
    MAPSynthetic,
    PotencySynthetic,
    RollSubstitution,
    RollTwiceSynthetic,
    RuleElementSynthetics,
    SenseSynthetic,
    StrikeAdjustment,
    StrikingSynthetic,
};
