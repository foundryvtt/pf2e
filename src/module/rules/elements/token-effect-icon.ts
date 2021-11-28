import { RuleElementPF2e, TokenEffect } from "../rule-element";

/**
 * @category RuleElement
 */
export class TokenEffectIconRuleElement extends RuleElementPF2e {
    override onAfterPrepareData() {
        const icon = typeof this.data.value === "string" ? this.data.value.trim() : null;
        this.actor.data.data.tokenEffects.push(new TokenEffect(icon || this.item.img));
    }
}
