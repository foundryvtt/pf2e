import {PF2RuleElement} from "../rule-element";
import {ItemData} from "../../item/dataDefinitions";
import {CharacterData, FamiliarData, NpcData} from "../../actor/actorDataDefinitions";
import {PF2DamageDice, PF2Modifier} from "../../modifiers";

/**
 * @category RuleElement
 */
export class PF2SenseRuleElement extends PF2RuleElement {

    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(
        actorData: CharacterData | NpcData | FamiliarData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const range = super.resolveValue(this.ruleData.range, this.ruleData, this.item, actorData);
        if (this.ruleData.selector && label) {
            if (!(actorData as any).data.traits.senses.some(s => s.type === this.ruleData.selector)) {
                const sense: any = {
                    label,
                    type: this.ruleData.selector
                };
                if (range) {
                    sense.value = range;
                }
                if (this.ruleData.acuity) {
                    sense.acuity = this.ruleData.acuity;
                }
                (actorData as any).data.traits.senses.push(sense);
            }
        } else {
            console.warn('PF2E | Sense requires at least a selector field and a label field or item name');
        }
    }
}
