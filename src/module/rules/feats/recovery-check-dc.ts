import { CharacterData, NPCData } from '@actor/data';
import { RuleElementPF2e } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2RecoveryCheckDCRuleElement extends RuleElementPF2e {
    onBeforePrepareData(actorData: CharacterData | NPCData) {
        const slug = this.ruleData.slug || this.item.data.slug;
        if (slug) {
            let recoveryModifier = getProperty(actorData.data.attributes, 'dying.recoveryMod') || 0;
            const synergizers = (getProperty(actorData.data.attributes, 'dying.synergizers') || []) as string[];
            if (!synergizers.includes(slug)) {
                synergizers.push(slug);
            }

            // figure out recovery check DC modifier
            const toughness = synergizers.includes('toughness');
            const mountainsStoutness =
                synergizers.includes('mountains-stoutness') || synergizers.includes('mountainsStoutness');
            if (toughness && mountainsStoutness) {
                recoveryModifier = -4;
            } else if (toughness || mountainsStoutness) {
                recoveryModifier = -1;
            }

            setProperty(actorData.data.attributes, 'dying.recoveryMod', recoveryModifier);
            setProperty(actorData.data.attributes, 'dying.synergizers', synergizers);
        } else {
            console.warn('PF2E | Recovery check DC requires at least a slug field or item slug');
        }
    }
}
