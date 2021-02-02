import { ItemData } from '../../item/dataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2RuleElement } from '../rule-element';

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
export class PF2TokenSizeRuleElement extends PF2RuleElement {
    onCreate(actorData: CharacterData | NpcData, item: ItemData, actorUpdates: any, tokens: any[]) {
        const value =
            SIZES[this.ruleData.value] ?? this.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);

        if (!value) {
            console.warn('PF2E | Token Image requires a non-empty value field');
        }

        tokens.forEach((token) => {
            token.height = value;
            token.width = value;
        });
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

    onDelete(actorData: CharacterData | NpcData, item: ItemData, actorUpdates: any, tokens: any[]) {
        if (getProperty(actorData, 'flags.pf2e.token.sizesource') === item._id) {
            tokens.forEach((token) => {
                token.height = getProperty(actorData, 'flags.pf2e.token.size.height');
                token.width = getProperty(actorData, 'flags.pf2e.token.size.width');
            });
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
