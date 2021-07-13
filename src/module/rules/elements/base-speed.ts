import { RuleElementPF2e } from '../rule-element';
import { CharacterData, FamiliarData, NPCData } from '@actor/data';

/**
 * @category RuleElement
 */
export class PF2BaseSpeedRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData | FamiliarData) {
        const value = this.resolveValue(this.data.value);
        if (this.data.selector && value) {
            const selector: string = this.data.selector.endsWith('-speed')
                ? this.data.selector.substring(-6)
                : this.data.selector;
            const existing = (actorData as any).data.attributes.speed.otherSpeeds.find((speed: { type: string }) => {
                return speed.type === selector;
            });
            if (existing) {
                if (existing.value < value) {
                    existing.value = value;
                }
            } else {
                (actorData as any).data.attributes.speed.otherSpeeds.push({
                    label: selector.charAt(0).toUpperCase() + selector.slice(1),
                    type: selector,
                    value,
                });
            }
        } else {
            console.warn(
                'PF2E | Base speed requires at least a selector field, a label field or item name, and a non-zero value field',
            );
        }
    }
}
