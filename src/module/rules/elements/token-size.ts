/* global getProperty */
import {ItemData} from "../../item/dataDefinitions";
import {CharacterData, NpcData} from "../../actor/actorDataDefinitions";
import {PF2RuleElement} from "../rule-element";

const SIZES = {
    'tiny': 0.6,
    'small': 0.8,
    'medium': 1,
    'large': 2,
    'huge': 3,
    'gargantuan': 4,
};

export class PF2TokenSizeRuleElement extends PF2RuleElement {

    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }
    
    onCreate(actorData: CharacterData|NpcData, item: ItemData, updates: any) {
        const value = SIZES[this.ruleData.value] ?? 
            this.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);

        if (!value) {
            console.warn('PF2E | Token Image requires a non-empty value field');
        }

        mergeObject(updates, {
            'token.width': value,
            'token.height': value,
            'flags.pf2e.token.sizesource': item._id,
        });
        if (!getProperty(actorData, 'flags.pf2e.token.size')) {
            mergeObject(updates, {
                'flags.pf2e.token.size': {
                    height: getProperty(actorData, 'token.height'),
                    width: getProperty(actorData, 'token.width'),
                }
            });
        }
    }
    
    onDelete(actorData: CharacterData|NpcData, item: ItemData, updates: any) {
        if (getProperty(actorData, 'flags.pf2e.token.sizesource') === item._id) {
            mergeObject(updates, {
                'token.height': getProperty(actorData, 'flags.pf2e.token.size.height'),
                'token.width': getProperty(actorData, 'flags.pf2e.token.size.width'),
                'flags.pf2e.token.-=sizesource': null,
                'flags.pf2e.token.-=size': null,
            });
        }
    }

}
