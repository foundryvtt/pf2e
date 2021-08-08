import { CreatureData } from "@actor/data";
import { RuleElementPF2e, TokenEffect } from "../rule-element";
import { RuleElementSynthetics } from "@module/rules/rules-data-definitions";

/**
 * @category RuleElement
 */
export class PF2TokenEffectIconRuleElement extends RuleElementPF2e {
    override onAfterPrepareData(actorData: CreatureData, _synthetics: RuleElementSynthetics) {
        const icon = typeof this.data.value === "string" ? this.data.value.trim() : null;
        actorData.data.tokenEffects.push(new TokenEffect(icon || this.item.img));
    }
}
