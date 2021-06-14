import { BasePhysicalItemData, BasePhysicalItemSource, MagicItemSystemData } from '@item/physical/data';
import { ContainerPF2e } from '.';

export type ContainerSource = BasePhysicalItemSource<'backpack', ContainerSystemData>;

export class ContainerData extends BasePhysicalItemData<ContainerPF2e> {
    /** @override */
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/backpack.svg';
}

export interface ContainerData extends Omit<ContainerSource, '_id' | 'effects'> {
    type: ContainerSource['type'];
    data: ContainerSource['data'];
    readonly _source: ContainerSource;
}

export interface ContainerSystemData extends MagicItemSystemData {
    capacity: {
        type: string;
        value: number;
        weightless: boolean;
    };
    currency: {
        cp: number;
        sp: number;
        gp: number;
        pp: number;
    };
}
