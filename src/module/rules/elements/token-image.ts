/* global getProperty */
import {ItemData} from "../../item/dataDefinitions";
import {CharacterData, NpcData} from "../../actor/actorDataDefinitions";
import {PF2RuleElement} from "../rule-element";

export class PF2TokenImageRuleElement extends PF2RuleElement {

    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }
    
    onCreate(actorData: CharacterData|NpcData, item: ItemData, updates: any) {
        const value = this.ruleData.value;

        if (!value) {
            console.warn('PF2E | Token Image requires a non-empty value field');
        }

        mergeObject(updates, {
            'token.overlayEffect': value,
            'flags.pf2e.token.imgsource': item._id,
        });
    }
    
    onDelete(actorData: CharacterData|NpcData, item: ItemData, updates: any) {
        const updatedActorData = mergeObject(actorData, updates, {inplace: false});
        if (getProperty(updatedActorData, 'flags.pf2e.token.imgsource') === item._id) {
            mergeObject(updates, {
                'token.overlayEffect': null,
                'flags.pf2e.token.-=imgsource': null,
            });
        }
    }

}
