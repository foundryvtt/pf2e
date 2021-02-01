import { ItemData } from '../../item/dataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2RuleElement } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2TokenImageRuleElement extends PF2RuleElement {
    onCreate(actorData: CharacterData | NpcData, item: ItemData, actorUpdates: any, tokens: any[]) {
        const value = this.ruleData.value;

        if (!value) {
            console.warn('PF2E | Token Image requires a non-empty value field');
        }

        tokens.forEach((token) => {
            token.img = value;
        });
        mergeObject(actorUpdates, {
            'token.img': value,
            'flags.pf2e.token.imgsource': item._id,
        });
        if (!getProperty(actorData, 'flags.pf2e.token.img')) {
            mergeObject(actorUpdates, {
                'flags.pf2e.token.img': getProperty(actorData, 'token.img'),
            });
        }
    }

    onDelete(actorData: CharacterData | NpcData, item: ItemData, actorUpdates: any, tokens: any[]) {
        if (getProperty(actorData, 'flags.pf2e.token.imgsource') === item._id) {
            tokens.forEach((token) => {
                token.img = getProperty(actorData, 'flags.pf2e.token.img');
            });
            mergeObject(actorUpdates, {
                'token.img': getProperty(actorData, 'flags.pf2e.token.img'),
                'flags.pf2e.token': {},
            });
            const token = getProperty(actorUpdates, 'flags.pf2e.token');
            token['-=img'] = null;
            token['-=imgsource'] = null;
        }
    }
}
