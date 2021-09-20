import { RuleElementPF2e } from "../rule-element";
import { MultipleAttackPenaltyPF2e, RuleElementSynthetics } from "../rules-data-definitions";
import { CharacterData, NPCData } from "@actor/data";

/**
 * @category RuleElement
 */
export class PF2MultipleAttackPenaltyRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(
        _actorData: CharacterData | NPCData,
        { multipleAttackPenalties }: RuleElementSynthetics
    ) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const label = this.resolveInjectedProperties(this.label);
        const value = this.resolveValue(this.data.value);
        if (selector && label && value) {
            const map: MultipleAttackPenaltyPF2e = { label, penalty: value };
            if (this.data.predicate) {
                map.predicate = this.data.predicate;
            }
            multipleAttackPenalties[selector] = (multipleAttackPenalties[selector] || []).concat(map);
        } else {
            console.warn(
                "PF2E | Multiple attack penalty requires at least a selector field and a non-empty value field"
            );
        }
    }
}
