import { SKILL_EXPANDED } from '@actor/base';
import { CharacterData, NPCData, SkillAbbreviation } from '@actor/data-definitions';
import { ModifierPF2e, MODIFIER_TYPE } from '../../modifiers';
import { RuleElementPF2e } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rules-data-definitions';

const KNOWN_TARGETS = {
    ac: { ability: 'dex', shortform: 'ac' },
};

/**
 * @category RuleElement
 */
export class PF2FixedProficiencyRuleElement extends RuleElementPF2e {
    onBeforePrepareData(actorData: CharacterData | NPCData, { statisticsModifiers }: PF2RuleElementSynthetics) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        let value = this.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        if (selector === 'ac') {
            // Special case for AC so the rule elements match what's written in the book
            value -= 10;
        }

        const label = this.getDefaultLabel(this.ruleData, this.item);
        const ability = this.ruleData.ability ?? KNOWN_TARGETS[selector]?.ability ?? SKILL_EXPANDED[selector]?.ability;

        if (!ability) {
            console.warn('PF2E | Fixed modifier requires an ability field, or a known selector.');
        } else if (!value) {
            console.warn('PF2E | Fixed modifier requires at least a non-zero value or formula field.');
        } else {
            const modifier = new ModifierPF2e(
                this.ruleData.name ?? label,
                value - actorData.data.abilities[ability].mod,
                MODIFIER_TYPE.PROFICIENCY,
            );
            modifier.label = label;
            statisticsModifiers[selector] = (statisticsModifiers[selector] || []).concat(modifier);
        }
    }

    onAfterPrepareData(actorData: CharacterData | NPCData) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const { data } = actorData;
        const skill: SkillAbbreviation | string = SKILL_EXPANDED[selector]?.shortform ?? selector;
        const target = data.skills[skill] ?? data.attributes[skill];
        const label = this.getDefaultLabel(this.ruleData, this.item);
        const force = this.ruleData.force;

        if (target) {
            for (const modifier of target.modifiers) {
                if ([MODIFIER_TYPE.ITEM, MODIFIER_TYPE.UNTYPED].includes(modifier.type) && modifier.modifier > 0) {
                    modifier.ignored = true;
                }
                if (force && modifier.type === MODIFIER_TYPE.PROFICIENCY && modifier.name !== label) {
                    modifier.ignored = true;
                }
            }
            target.applyStackingRules();
            target.value = target.totalModifier + (skill === 'ac' ? 10 : 0);
        }
    }
}
