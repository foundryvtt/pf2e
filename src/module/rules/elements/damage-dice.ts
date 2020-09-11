import {PF2RuleElement} from "../rule-element";
import {ItemData} from "../../item/dataDefinitions";
import {CharacterData, NpcData} from "../../actor/actorDataDefinitions";
import {PF2DamageDice, PF2Modifier} from "../../modifiers";

export class PF2DamageDiceRuleElement extends PF2RuleElement {

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
        const value = duplicate(this.ruleData);
        delete value.key;
        if (this.ruleData.value) {
            const bracketed = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData, {});
            mergeObject(value, bracketed, { inplace: true, overwrite: true});
            delete value.value;
        }
        value.name = super.getDefaultLabel(value, this.item);
        if (this.ruleData.selector && value.name && value) {
            const dice = new PF2DamageDice(value);
            damageDice[value.selector] = (damageDice[value.selector] || []).concat(dice);
        } else {
            console.warn('PF2E | Damage dice requires at least a selector field, and a label field or item name');
        }
    }
}
