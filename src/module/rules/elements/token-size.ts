import { ItemDataPF2e } from '@item/data';
import { CharacterData, NPCData } from '@actor/data';
import { RuleElementPF2e } from '../rule-element';

const SIZES = {
    tiny: 0.6,
    small: 0.8,
    medium: 1,
    large: 2,
    huge: 3,
    gargantuan: 4,
};

/**
 * @category RuleElement
 */
export class PF2TokenSizeRuleElement extends RuleElementPF2e {
    override onCreate(actorData: CharacterData | NPCData, item: ItemDataPF2e, actorUpdates: any, tokens: any[]) {
        const value =
            SIZES[this.ruleData.value] ?? this.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);

        if (!value) {
            console.warn('PF2E | Token Image requires a non-empty value field');
        }

        const tokenUpdates: Promise<any>[] = [];
        tokens.forEach((token) => {
            tokenUpdates.push(token.update({ height: value, width: value }));
        });
        Promise.allSettled(tokenUpdates);

        mergeObject(actorUpdates, {
            'token.height': value,
            'token.width': value,
            'flags.pf2e.token.sizesource': item._id,
        });
        if (!getProperty(actorData, 'flags.pf2e.token.size')) {
            mergeObject(actorUpdates, {
                'flags.pf2e.token.size': {
                    height: getProperty(actorData, 'token.height'),
                    width: getProperty(actorData, 'token.width'),
                },
            });
        }
    }

    override onDelete(actorData: CharacterData | NPCData, item: ItemDataPF2e, actorUpdates: any, tokens: any[]) {
        if (getProperty(actorData, 'flags.pf2e.token.sizesource') === item._id) {
            const width = getProperty(actorData, 'flags.pf2e.token.size.height');
            const height = getProperty(actorData, 'flags.pf2e.token.size.width');

            const tokenUpdates: Promise<any>[] = [];
            tokens.forEach((token) => {
                tokenUpdates.push(token.update({ height, width }));
            });
            Promise.allSettled(tokenUpdates);

            mergeObject(actorUpdates, {
                'token.height': getProperty(actorData, 'flags.pf2e.token.size.height'),
                'token.width': getProperty(actorData, 'flags.pf2e.token.size.width'),
                'flags.pf2e.token': {},
            });
            const token = getProperty(actorUpdates, 'flags.pf2e.token');
            token['-=size'] = null;
            token['-=sizesource'] = null;
        }
    }
}
