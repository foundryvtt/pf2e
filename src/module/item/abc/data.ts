import { ItemSystemData } from '@item/data/base';

export interface ABCFeatureEntryData {
    pack?: string;
    id: string;
    img: ImagePath;
    name: string;
    level: number;
}

export interface ABCSystemData extends ItemSystemData {
    items: Record<string, ABCFeatureEntryData>;
}
