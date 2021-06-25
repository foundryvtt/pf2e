import { RuleElementPF2e } from '../rule-element';
import { CharacterData, FamiliarData, NPCData } from '@actor/data';

/**
 * @category RuleElement
 */
export class PF2ActorTraits extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData | FamiliarData) {
        const add = (this.ruleData.add ?? []) as string[];
        if (add.length > 0) {
            actorData.data.traits.traits.value.push(...add);
        } else {
            console.warn('PF2E | Actor traits rule element requires at least a non-empty add field');
        }
    }
}
