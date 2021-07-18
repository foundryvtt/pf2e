import { DamageDicePF2e, ModifierPF2e, ModifierPredicate } from '../modifiers';
import { WeaponData } from '@item/data';
import { RollNotePF2e } from '../notes';

export interface RuleElementData {
    key: string;
    data?: any;
    selector?: string;
    value?: RuleValue;
    scope?: string;
    label: string;
    slug?: string;
    predicate?: ModifierPredicate;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority: number;
    ignored: boolean;
}

export type RuleElementSource = Omit<RuleElementData, 'label' | 'priority' | 'ignored'> & {
    label?: string;
    priority?: number;
};

export type RuleValue = string | number | null | BracketedValue;

export interface Bracket {
    start?: number;
    end?: number;
    value: number;
}

export interface BracketedValue {
    field?: string;
    brackets: Bracket[];
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
    strikes: WeaponData[];
    rollNotes: Record<string, RollNotePF2e[]>;
    weaponPotency: Record<string, WeaponPotencyPF2e[]>;
    striking: Record<string, StrikingPF2e[]>;
    multipleAttackPenalties: Record<string, MultipleAttackPenaltyPF2e[]>;
}
