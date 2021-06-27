import { ItemSystemData } from '@item/data/base';
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from '@item/data/non-physical';
import { ZeroToFour } from '@module/data';
import type { LorePF2e } from '.';

export type LoreSource = BaseNonPhysicalItemSource<'lore', LoreSystemData>;

export class LoreData extends BaseNonPhysicalItemData<LorePF2e> {
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/lore.svg';
}

export interface LoreData extends Omit<LoreSource, '_id' | 'effects'> {
    type: LoreSource['type'];
    data: LoreSource['data'];
    readonly _source: LoreSource;
}

interface LoreSystemData extends ItemSystemData {
    mod: {
        value: number;
    };
    proficient: {
        value: ZeroToFour;
    };
    variants?: Record<string, { label: string; options: string }>;
}
