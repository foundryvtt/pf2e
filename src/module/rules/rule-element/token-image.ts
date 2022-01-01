import { RuleElementPF2e } from "./";

/**
 * @category RuleElement
 */
export class TokenImageRuleElement extends RuleElementPF2e {
    override onAfterPrepareData() {
        const value = this.data.value;

        if (!value) {
            console.warn("PF2e System | Token Image requires a non-empty value field");
            return;
        }

        mergeObject(this.actor.overrides, { token: { img: value } });
    }
}
