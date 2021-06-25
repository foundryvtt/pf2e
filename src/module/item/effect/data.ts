import { ItemSystemData } from '@item/data/base';
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from '@item/data/non-physical';
import { EffectPF2e } from '.';

export type EffectSource = BaseNonPhysicalItemSource<'effect', EffectSystemData>;

export class EffectData extends BaseNonPhysicalItemData<EffectPF2e> {
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/effect.svg';
}

export interface EffectData extends Omit<EffectSource, '_id' | 'effects'> {
    type: EffectSource['type'];
    data: EffectSource['data'];
    readonly _source: EffectSource;
}

export interface EffectSystemData extends ItemSystemData {
    level: {
        value: number;
    };
    expired: boolean;
    remaining: string;
    duration: {
        value: number;
        unit: string;
        sustained: boolean;
        expiry: 'turn-start' | 'turn-end';
    };
    start: {
        value: number;
        initiative: number | null;
    };
    tokenIcon?: {
        show: boolean;
    };
}
