import { DamageDicePF2e, ModifierPF2e } from "../modifiers";
import { RollNotePF2e } from "../notes";
import { WeaponPF2e } from "@item";
import { PredicatePF2e, RawPredicate } from "@system/predication";

export type RuleElementSource = {
    key: string;
    data?: unknown;
    selector?: string;
    value?: RuleValue | BracketedValue;
    scope?: string;
    label?: string;
    slug?: string;
    predicate?: RawPredicate;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority?: number;
    ignored?: boolean;
    requiresInvestment?: boolean;
};

export interface RuleElementData extends RuleElementSource {
    key: string;
    data?: any;
    selector?: string;
    value?: RuleValue | BracketedValue;
    scope?: string;
    label: string;
    slug?: string;
    predicate?: PredicatePF2e;
    priority: number;
    ignored: boolean;
}

export type RuleValue = string | number | boolean | object | null;

export interface Bracket<T extends object | number | string> {
    start?: number;
    end?: number;
    value: T;
}

export interface BracketedValue<T extends object | number | string = object | number | string> {
    field?: string;
    brackets: Bracket<T>[];
}

export interface WeaponPotencyPF2e {
    label: string;
    bonus: number;
    predicate?: PredicatePF2e;
}

export interface StrikingPF2e {
    label: string;
    bonus: number;
    predicate?: PredicatePF2e;
}

export interface MultipleAttackPenaltyPF2e {
    label: string;
    penalty: number;
    predicate?: PredicatePF2e;
}

export interface RuleElementSynthetics {
    damageDice: Record<string, DamageDicePF2e[]>;
    statisticsModifiers: Record<string, ModifierPF2e[]>;
    strikes: Embedded<WeaponPF2e>[];
    rollNotes: Record<string, RollNotePF2e[]>;
    weaponPotency: Record<string, WeaponPotencyPF2e[]>;
    striking: Record<string, StrikingPF2e[]>;
    multipleAttackPenalties: Record<string, MultipleAttackPenaltyPF2e[]>;
}
