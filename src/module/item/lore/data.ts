import { ItemSystemData } from '@item/data/base';
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from '@item/data/non-physical';
import type { LorePF2e } from '.';

export type LoreSource = BaseNonPhysicalItemSource<'lore', LoreSystemData>;

export class LoreData extends BaseNonPhysicalItemData<LorePF2e> {
    /** @override */
    static DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/lore.svg';
}

export interface LoreData extends Omit<LoreSource, '_id' | 'effects'> {
    type: LoreSource['type'];
    data: LoreSource['data'];
    readonly _source: LoreSource;
}

interface LoreSystemData extends ItemSystemData {
    mod: {
        value: 0;
    };
    proficient: {
        value: 0;
    };
    item: {
        value: 0;
    };
    variants?: Record<string, { label: string; options: string }>;
}
