import { PredicatePF2e } from "@system/predication";
import { RuleElementPF2e } from "./";

/**
 * @category RuleElement
 */
export class MultipleAttackPenaltyRuleElement extends RuleElementPF2e {
    override beforePrepareData(): void {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const label = this.resolveInjectedProperties(this.label);
        const value = Number(this.resolveValue(this.data.value)) || 0;
        if (selector && label && value) {
            const map: MultipleAttackPenaltyPF2e = { label, penalty: value };
            if (this.data.predicate) map.predicate = this.data.predicate;
            const penalties = (this.actor.synthetics.multipleAttackPenalties[selector] ??= []);
            penalties.push(map);
        } else {
            console.warn(
                "PF2E | Multiple attack penalty requires at least a selector field and a non-empty value field"
            );
        }
    }
}

export interface MultipleAttackPenaltyPF2e {
    label: string;
    penalty: number;
    predicate?: PredicatePF2e;
}
