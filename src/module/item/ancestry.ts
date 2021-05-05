import { ABCItemPF2e } from './abc';
import { AncestryData, Size } from './data/types';

export class AncestryPF2e extends ABCItemPF2e {
    get hitPoints(): number {
        return this.data.data.hp;
    }

    get speed(): number {
        return this.data.data.speed;
    }

    get size(): Size {
        return this.data.data.size;
    }
}

export interface AncestryPF2e {
    data: AncestryData;
    _data: AncestryData;
}
