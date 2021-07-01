import { CreatureData } from '@actor/data';
import { RuleElementPF2e, TokenEffect } from '../rule-element';
import { RuleElementSyntheticsPF2e } from '@module/rules/rules-data-definitions';

/**
 * @category RuleElement
 */
export class PF2TokenEffectIconRuleElement extends RuleElementPF2e {
    override onAfterPrepareData(actorData: CreatureData, synthetics: RuleElementSyntheticsPF2e) {
        super.onAfterPrepareData(actorData, synthetics);

        const icon = this.ruleData.value ?? this.item.img ?? 'systems/pf2e/icons/default-icons/mystery-man.svg';

        actorData.data.tokenEffects ??= [];
        actorData.data.tokenEffects.push(new TokenEffect(icon));
    }
}
