import { DamageDicePF2e, ModifierPF2e, ModifierPredicate, RawPredicate } from "../modifiers";
import { RollNotePF2e } from "../notes";
import { WeaponPF2e } from "@item";

export interface RuleElementData {
    key: string;
    data?: any;
    selector?: string;
    value?: RuleValue | BracketedValue;
    scope?: string;
    label: string;
    slug?: string;
    predicate?: ModifierPredicate;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority: number;
    ignored: boolean;
}

export type RuleElementSource = Omit<RuleElementData, "ignored" | "label" | "predicate" | "priority"> & {
    label?: string;
    priority?: number;
    predicate?: RawPredicate;
};

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
    predicate?: ModifierPredicate;
}

export interface StrikingPF2e {
    label: string;
    bonus: number;
    predicate?: ModifierPredicate;
}

export interface MultipleAttackPenaltyPF2e {
    label: string;
    penalty: number;
    predicate?: ModifierPredicate;
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
