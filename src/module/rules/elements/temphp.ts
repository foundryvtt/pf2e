import { ItemDataPF2e } from '@item/data';
import { RuleElementPF2e } from '../rule-element';
import { CharacterData, NPCData } from '@actor/data';

/**
 * @category RuleElement
 */
export class PF2TempHPRuleElement extends RuleElementPF2e {
    override onCreate(actorUpdates: Record<string, unknown>) {
        const updatedActorData = mergeObject(this.actor.data, actorUpdates, { inplace: false });
        const value = this.resolveValue(this.data.value);

        if (!value) {
            console.warn('PF2E | Temporary HP requires a non-zero value field or a formula field');
        }

        if (getProperty(updatedActorData, 'data.attributes.hp.temp') < value) {
            mergeObject(actorUpdates, {
                'data.attributes.hp.temp': value,
                'data.attributes.hp.tempsource': this.item.id,
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
