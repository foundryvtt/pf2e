import { ItemDataPF2e } from '@item/data';
import { CharacterData, NPCData } from '@actor/data';
import { RuleElementPF2e } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2TempHPRuleElement extends RuleElementPF2e {
    override onCreate(actorData: CharacterData | NPCData, item: ItemDataPF2e, actorUpdates: any) {
        const updatedActorData = mergeObject(actorData, actorUpdates, { inplace: false });
        const value = this.resolveValue(this.ruleData.value, this.ruleData, this.item, updatedActorData);

        if (!value) {
            console.warn('PF2E | Temporary HP requires a non-zero value field or a formula field');
        }

        if (getProperty(updatedActorData, 'data.attributes.hp.temp') < value) {
            mergeObject(actorUpdates, {
                'data.attributes.hp.temp': value,
                'data.attributes.hp.tempsource': item._id,
            });
        }
    }

    override onDelete(actorData: CharacterData | NPCData, item: ItemDataPF2e, actorUpdates: any) {
        const updatedActorData = mergeObject(actorData, actorUpdates, { inplace: false });
        if (getProperty(updatedActorData, 'data.attributes.hp.tempsource') === item._id) {
            mergeObject(actorUpdates, {
                'data.attributes.hp.temp': 0,
            });
            getProperty(actorUpdates, 'data.attributes.hp')['-=tempsource'] = null;
        }
    }
}
