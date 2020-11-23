import {PF2RuleElement} from "../rule-element";
import {ItemData} from "../../item/dataDefinitions";
import {CharacterData, NpcData} from "../../actor/actorDataDefinitions";
import {PF2DamageDice, PF2Modifier, PF2ModifierPredicate, PF2ModifierType} from "../../modifiers";
import PF2EActor from "../../actor/actor";

/**
 * @category RuleElement
 */
export class PF2FlatModifierRuleElement extends PF2RuleElement {

    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(
        actorData: CharacterData | NpcData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        if (this.ruleData.selector && label && value) {
            const modifier = new PF2Modifier(label, value, this.ruleData.type ?? PF2ModifierType.UNTYPED);
            if (this.ruleData.damageType) {
                modifier.damageType = this.ruleData.damageType;
            }
            if (this.ruleData.damageCategory) {
                modifier.damageCategory = this.ruleData.damageCategory;
            }
            if (this.ruleData.predicate) {
                modifier.predicate = new PF2ModifierPredicate(this.ruleData.predicate);
                modifier.ignored = !PF2ModifierPredicate.test(modifier.predicate, PF2EActor.getRollOptions(actorData.flags, this.ruleData['roll-options'] ?? []));
            }
            statisticsModifiers[this.ruleData.selector] = (statisticsModifiers[this.ruleData.selector] || []).concat(modifier);
        } else {
            console.warn('PF2E | Flat modifier requires at least a selector field, a label field or item name, and a non-zero value field');
        }
    }
}
