import { ConditionPF2e } from './base';

export class BlindedConditionPF2e extends ConditionPF2e {
    override get value() {
        return null;
    }

    /** Get instances of the Dazzled condition, which is overridden by Dazzled */
    override prepareSiblingData(): void {
        const overrides = this.actor.conditions.filter((condition) => condition instanceof ConditionPF2e.Dazzled);
        this.data.data.references.overrides = [];
        for (const override of overrides) {
            this.data.data.references.overrides.push({ type: 'condition', id: override.id });
        }
    }
}
