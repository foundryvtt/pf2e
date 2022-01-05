import { TokenEffect } from "@actor/token-effect";
import { RuleElementPF2e } from "./";

/**
 * @category RuleElement
 */
export class TokenEffectIconRuleElement extends RuleElementPF2e {
    override onAfterPrepareData() {
        const path =
            typeof this.data.value === "string" ? this.resolveInjectedProperties(this.data.value) : this.item.img;
        this.actor.data.data.tokenEffects.push(new TokenEffect(path.trim()));
    }
}
