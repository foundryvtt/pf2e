import { PF2DamageDice, PF2Modifier } from '../modifiers';
import { WeaponData } from '../item/dataDefinitions';

export interface PF2RuleElementData {
    key: string;
    data?: any;
}

export interface PF2RuleElementSynthetics {
    damageDice: Record<string, PF2DamageDice[]>;
    statisticsModifiers: Record<string, PF2Modifier[]>;
    strikes: WeaponData[];
}
