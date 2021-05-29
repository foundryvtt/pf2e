import { HazardData } from './data';
import { ActorPF2e } from '@actor/index';

export class HazardPF2e extends ActorPF2e {
    /** @override */
    static get schema(): typeof HazardData {
        return HazardData;
    }
}

export interface HazardPF2e {
    readonly data: HazardData;
}
