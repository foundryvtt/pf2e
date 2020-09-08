/* global getProperty */
import {ItemData} from "../../item/dataDefinitions";
import {CharacterData, NpcData} from "../../actor/actorDataDefinitions";
import {PF2RuleElement} from "../rule-element";

interface TempHPRuleData {
    value?: number;
    formula?: string;
}

export class PF2TempHPRuleElement extends PF2RuleElement {

    ruleData: TempHPRuleData;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = <TempHPRuleData>ruleData;
        this.item = item;
    }
    
    onCreate(actorData: CharacterData|NpcData, item: ItemData, updates: any) {
        const updatedActorData = mergeObject(actorData, updates, {inplace: false});
        const value = this.resolveValue(this.ruleData.value, this.ruleData, this.item, updatedActorData);

        if (!value) {
            console.warn('PF2E | Temporary HP requires a non-zero value field or a formula field');
        }

        if (getProperty(updatedActorData, 'data.attributes.hp.temp') < value) {
            mergeObject(updates, {
                'data.attributes.hp.temp': value,
                'data.attributes.hp.tempsource': item._id,
            });
        }
    }
    
    onDelete(actorData: CharacterData|NpcData, item: ItemData, updates: any) {
        const updatedActorData = mergeObject(actorData, updates, {inplace: false});
        if (getProperty(updatedActorData, 'data.attributes.hp.tempsource') === item._id) {
            mergeObject(updates, {
                'data.attributes.hp.temp': 0,
                'data.attributes.hp.-=tempsource': null,
            });
        }
    }

}
