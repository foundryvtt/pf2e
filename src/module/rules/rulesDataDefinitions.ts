import { PF2DamageDice, PF2Modifier } from '../modifiers';
import { WeaponData } from '../item/dataDefinitions';
import { PF2RollNote } from '../notes';

export interface PF2RuleElementData {
    key: string;
    data?: any;
}

export interface PF2RuleElementSynthetics {
    damageDice: Record<string, PF2DamageDice[]>;
    statisticsModifiers: Record<string, PF2Modifier[]>;
    strikes: WeaponData[];
    rollNotes: Record<string, PF2RollNote[]>;
}
