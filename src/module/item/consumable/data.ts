import {
    ActivatedEffectData,
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
} from '@item/physical/data';
import { SpellSource } from '@item/spell/data';
import type { ConsumablePF2e } from '.';

export type ConsumableSource = BasePhysicalItemSource<'consumable', ConsumableSystemData>;

export class ConsumableData extends BasePhysicalItemData<ConsumablePF2e> {
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/consumable.svg';
}

export interface ConsumableData extends Omit<ConsumableSource, '_id' | 'effects'> {
    type: ConsumableSource['type'];
    data: ConsumableSource['data'];
    readonly _source: ConsumableSource;
}

export type ConsumableType = keyof ConfigPF2e['PF2E']['consumableTypes'];
export type ConsumableTrait = keyof ConfigPF2e['PF2E']['consumableTraits'];
type ConsumableTraits = PhysicalItemTraits<ConsumableTrait>;

interface ConsumableSystemData extends MagicItemSystemData, ActivatedEffectData {
    traits: ConsumableTraits;

    consumableType: {
        value: ConsumableType;
    };
    uses: {
        value: number;
        max: number;
        per: any;
        autoUse: boolean;
        autoDestroy: boolean;
    };
    charges: {
        value: number;
        max: number;
    };
    consume: {
        value: string;
        _deprecated: boolean;
    };
    autoUse: {
        value: boolean;
    };
    autoDestroy: {
        value: boolean;
        _deprecated: boolean;
    };
    spell: {
        data?: SpellSource | null;
        heightenedLevel?: number | null;
    };
}
