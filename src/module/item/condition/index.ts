import { ItemPF2e } from '../base';
import { ConditionData } from './data';

export class ConditionPF2e extends ItemPF2e {
    static override get schema(): typeof ConditionData {
        return ConditionData;
    }

    get value(): number | null {
        const value = this.data.data.value;
        return value.isValued ? value.value : null;
    }

    get duration(): number | null {
        return this.data.data.duration.perpetual ? null : this.data.data.duration.value;
    }

    /** Is the condition currently active? */
    get isActive(): boolean {
        return this.data.data.active;
    }

    /** Is the condition from the pf2e system or a module? */
    get fromSystem(): boolean {
        return !!this.getFlag('pf2e', 'condition');
    }

    /** Is the condition found in the token HUD menu? */
    get isInHUD(): boolean {
        return this.data.data.sources.hud;
    }
}

export interface ConditionPF2e {
    readonly data: ConditionData;

    getFlag(scope: string, key: string): unknown;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'condition'): true | undefined;
}
