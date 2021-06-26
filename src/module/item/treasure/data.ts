import { BasePhysicalItemData, BasePhysicalItemSource, PhysicalSystemData } from '@item/physical/data';
import { TreasurePF2e } from '.';

export type TreasureSource = BasePhysicalItemSource<'treasure', TreasureSystemData>;

export class TreasureData extends BasePhysicalItemData<TreasurePF2e> {
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/treasure.svg';
}

export interface TreasureData extends Omit<TreasureSource, '_id' | 'effects'> {
    type: TreasureSource['type'];
    data: TreasureSource['data'];
    readonly _source: TreasureSource;

    isInvested: null;
}

export interface TreasureSystemData extends PhysicalSystemData {
    denomination: {
        value: 'pp' | 'gp' | 'sp' | 'cp';
    };
    value: {
        value: number;
    };
}
