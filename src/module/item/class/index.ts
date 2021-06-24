import { ABCItemPF2e } from '../abc';
import { ClassData } from './data';

export class ClassPF2e extends ABCItemPF2e {
    static override get schema(): typeof ClassData {
        return ClassData;
    }

    get hpPerLevel(): number {
        return this.data.data.hp;
    }
}

export interface ClassPF2e {
    readonly data: ClassData;
}
