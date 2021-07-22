import { ConditionPF2e } from './base';

export class DazzledConditionPF2e extends ConditionPF2e {
    /** Get instances of the Blinded condition, which overrides Dazzled */
    override prepareSiblingData(): void {
        this.overriders = this.actor.conditions.filter((condition) => condition instanceof ConditionPF2e.Blinded);
        this.data.data.references.overriddenBy = [];
        for (const overrider of this.overriders) {
            this.data.data.references.overriddenBy.push({ type: 'condition', id: overrider.id });
        }
    }
}

export interface DazzledConditionPF2e extends ConditionPF2e {
    get value(): null;
}
