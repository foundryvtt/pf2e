import { RuleElementPF2e } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2TokenImageRuleElement extends RuleElementPF2e {
    override onAfterPrepareData() {
        const value = this.data.value;

        if (!value) {
            console.warn('PF2E System | Token Image requires a non-empty value field');
            return;
        }

        mergeObject(this.actor.overrides, { token: { img: value } });
    }
}
