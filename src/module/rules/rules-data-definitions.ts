import { DamageDicePF2e, ModifierPF2e, ModifierPredicate } from '../modifiers';
import { WeaponData } from '@item/data-definitions';
import { PF2RollNote } from '../notes';

export interface PF2RuleElementData {
    key: string;
    data?: any;
    selector?: string;
    value?: unknown;
    scope?: string;
}

export interface PF2WeaponPotency {
    label: string;
    bonus: number;
    predicate?: ModifierPredicate;
}

export interface PF2Striking {
    label: string;
    bonus: number;
    predicate?: ModifierPredicate;
}

export interface PF2MultipleAttackPenalty {
    label: string;
    penalty: number;
    predicate?: ModifierPredicate;
}

export interface PF2RuleElementSynthetics {
    damageDice: Record<string, DamageDicePF2e[]>;
    statisticsModifiers: Record<string, ModifierPF2e[]>;
    strikes: WeaponData[];
    rollNotes: Record<string, PF2RollNote[]>;
    weaponPotency: Record<string, PF2WeaponPotency[]>;
    striking: Record<string, PF2Striking[]>;
    multipleAttackPenalties: Record<string, PF2MultipleAttackPenalty[]>;
}
