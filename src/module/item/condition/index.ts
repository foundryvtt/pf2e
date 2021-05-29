import { ItemPF2e } from '../base';
import { ConditionData } from './data';

export class ConditionPF2e extends ItemPF2e {
    /** @override */
    static get schema(): typeof ConditionData {
        return ConditionData;
    }

    /** Is the condition from the pf2e system or a module? */
    get fromSystem(): boolean {
        return !!this.getFlag('pf2e', 'condition');
    }
}

export interface ConditionPF2e {
    readonly data: ConditionData;

    getFlag(scope: string, key: string): unknown;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'condition'): true | undefined;
}
