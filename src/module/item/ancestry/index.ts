import { Size } from '@module/data';
import { ABCItemPF2e } from '../abc';
import { AncestryData } from './data';

export class AncestryPF2e extends ABCItemPF2e {
    static override get schema(): typeof AncestryData {
        return AncestryData;
    }

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
    readonly data: AncestryData;
}
