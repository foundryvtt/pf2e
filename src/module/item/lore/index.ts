import { ItemPF2e } from '@item/base';
import { LoreData } from './data';

export class LorePF2e extends ItemPF2e {
    /** @override */
    static get schema(): typeof LoreData {
        return LoreData;
    }
}

export interface LorePF2e {
    readonly data: LoreData;
}
