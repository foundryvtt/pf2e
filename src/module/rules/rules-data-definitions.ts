import { DamageDicePF2e, ModifierPF2e, ModifierPredicate } from '../modifiers';
import { WeaponData } from '@item/data';
import { RollNotePF2e } from '../notes';

export interface PF2RuleElementData {
    key: string;
    data?: any;
    selector?: string;
    value?: unknown;
    scope?: string;
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

export interface RuleElementSyntheticsPF2e {
    damageDice: Record<string, DamageDicePF2e[]>;
    statisticsModifiers: Record<string, ModifierPF2e[]>;
    strikes: WeaponData[];
    rollNotes: Record<string, RollNotePF2e[]>;
    weaponPotency: Record<string, WeaponPotencyPF2e[]>;
    striking: Record<string, StrikingPF2e[]>;
    multipleAttackPenalties: Record<string, MultipleAttackPenaltyPF2e[]>;
}
