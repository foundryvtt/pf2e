import { ItemDataPF2e } from '@item/data';
import { CharacterData, NPCData } from '@actor/data';
import { RuleElementPF2e } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2TokenImageRuleElement extends RuleElementPF2e {
    override onCreate(actorData: CharacterData | NPCData, item: ItemDataPF2e, actorUpdates: any, tokens: any[]) {
        const value = this.data.value;

        if (!value) {
            console.warn('PF2E | Token Image requires a non-empty value field');
        }

        const tokenUpdates: Promise<any>[] = [];
        tokens.forEach((token) => {
            tokenUpdates.push(token.update({ img: value }));
        });
        Promise.allSettled(tokenUpdates);

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

    override onDelete(actorData: CharacterData | NPCData, item: ItemDataPF2e, actorUpdates: any, tokens: any[]) {
        if (getProperty(actorData, 'flags.pf2e.token.imgsource') === item._id) {
            const img = getProperty(actorData, 'flags.pf2e.token.img');
            const tokenUpdates: Promise<any>[] = [];
            tokens.forEach((token) => {
                tokenUpdates.push(token.update({ img }));
            });
            Promise.allSettled(tokenUpdates);

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
