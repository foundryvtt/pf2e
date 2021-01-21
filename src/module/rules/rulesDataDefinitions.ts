import { PF2DamageDice, PF2Modifier, PF2ModifierPredicate } from '../modifiers';
import { WeaponData } from '../item/dataDefinitions';
import { PF2RollNote } from '../notes';

export interface PF2RuleElementData {
    key: string;
    data?: any;
}

export interface PF2WeaponPotency {
    label: string;
    bonus: number;
    predicate?: PF2ModifierPredicate;
}

export interface PF2Striking {
    label: string;
    bonus: number;
    predicate?: PF2ModifierPredicate;
}

export interface PF2MultipleAttackPenalty {
    label: string;
    penalty: number;
    predicate?: PF2ModifierPredicate;
}

export interface PF2RuleElementSynthetics {
    damageDice: Record<string, PF2DamageDice[]>;
    statisticsModifiers: Record<string, PF2Modifier[]>;
    strikes: WeaponData[];
    rollNotes: Record<string, PF2RollNote[]>;
    weaponPotency: Record<string, PF2WeaponPotency[]>;
    striking: Record<string, PF2Striking[]>;
    multipleAttackPenalties: Record<string, PF2MultipleAttackPenalty[]>;
}
