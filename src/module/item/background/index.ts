import { ABCItemPF2e } from '../abc';
import { BackgroundData } from './data';

export class BackgroundPF2e extends ABCItemPF2e {
    /** @override */
    static get schema(): typeof BackgroundData {
        return BackgroundData;
    }
}

export interface BackgroundPF2e {
    readonly data: BackgroundData;
}
