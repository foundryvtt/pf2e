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
            'token.img': value,
            'flags.pf2e.token.imgsource': item._id,
        });
        if (!getProperty(actorData, 'flags.pf2e.token.img')) {
            mergeObject(updates, {
                'flags.pf2e.token.img': getProperty(actorData, 'token.img'),
            });
        }
    }
    
    onDelete(actorData: CharacterData|NpcData, item: ItemData, updates: any) {
        if (getProperty(actorData, 'flags.pf2e.token.imgsource') === item._id) {
            mergeObject(updates, {
                'token.img': getProperty(actorData, 'flags.pf2e.token.img'),
                'flags.pf2e.token.-=img': null,
                'flags.pf2e.token.-=imgsource': null,
            });
        }
    }

}
