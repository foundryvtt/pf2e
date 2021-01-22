import { ItemData } from '../../item/dataDefinitions';
import { PF2RuleElement } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2EffectTargetRuleElement extends PF2RuleElement {
    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }
}
