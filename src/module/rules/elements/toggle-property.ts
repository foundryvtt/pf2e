/* global getProperty */
import {ItemData} from "../../item/dataDefinitions";
import {CharacterData, NpcData} from "../../actor/actorDataDefinitions";
import {PF2DamageDice, PF2Modifier} from "../../modifiers";
import {PF2RuleElement} from "../rule-element";

export class PF2TogglePropertyRuleElement extends PF2RuleElement {

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
        const label = super.getDefaultLabel(this.ruleData, this.item);
        if (label && this.ruleData.property) {
            (actorData.data as any).toggles.actions.push({
                label,
                inputName: this.ruleData.property,
                checked: getProperty(actorData, this.ruleData.property)
            });
        } else {
            console.warn('PF2E | Toggle flag requires at least a label field or item name, and a property field with the name of the property');
        }
    }
}
