import { ItemDataPF2e } from '@item/data/types';
import { CharacterData, NPCData } from '@actor/data-definitions';
import { RuleElementPF2e } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2TokenImageRuleElement extends RuleElementPF2e {
    onCreate(actorData: CharacterData | NPCData, item: ItemDataPF2e, actorUpdates: any, tokens: any[]) {
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

    onDelete(actorData: CharacterData | NPCData, item: ItemDataPF2e, actorUpdates: any, tokens: any[]) {
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
