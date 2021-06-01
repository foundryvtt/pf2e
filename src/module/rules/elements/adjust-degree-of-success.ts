import { RuleElementPF2e } from '../rule-element';
import { CharacterData, NPCData } from '@actor/data';
import { SAVE_TYPES, SKILL_DICTIONARY } from '@actor/data/values';
import { Saves, SkillAbbreviation } from '@actor/creature/data';
import { PF2CheckDCModifiers } from '@system/check-degree-of-success';
import { ModifierPredicate } from '@module/modifiers';

interface DegreeOfSuccessAdjustment {
    modifiers: PF2CheckDCModifiers;
    predicate?: ModifierPredicate;
}

/**
 * @category RuleElement
 */
export class PF2AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e {
    onBeforePrepareData(actorData: CharacterData | NPCData) {
        const selector: string = this.ruleData.selector ?? '';
        const type: string = this.ruleData.type ?? '';
        const adjustment = this.ruleData.adjustment as PF2CheckDCModifiers;

        if (selector && type && adjustment && typeof adjustment === 'object') {
            if (!this.isAdjustmentData(adjustment)) {
                console.warn('PF2E | Degree of success adjustment does not have the correct format.', adjustment);
            }
            const completeAdjustment: DegreeOfSuccessAdjustment = {
                modifiers: adjustment,
            };
            if (this.ruleData.predicate) {
                completeAdjustment.predicate = new ModifierPredicate(this.ruleData.predicate);
            }
            if (type === 'save') {
                const save = selector as keyof Saves;
                if (SAVE_TYPES.includes(save)) {
                    actorData.data.saves[save].adjustment ??= {};
                    mergeObject(actorData.data.saves[save].adjustment, completeAdjustment);
                }
            } else if (type === 'skill') {
                const skill = this.skillAbbreviationFromString(selector);
                if (skill) {
                    actorData.data.skills[skill].adjustment ??= {};
                    mergeObject(actorData.data.skills[skill].adjustment, completeAdjustment);
                }
            } else if (type === 'attribute') {
                if (selector === 'perception') {
                    actorData.data.attributes.perception.adjustment ??= {};
                    mergeObject(actorData.data.attributes.perception.adjustment, completeAdjustment);
                } else {
                    console.warn(`PF2E | Degree of success adjustment for selector '${selector}' is not implemented.`);
                }
            } else {
                console.warn(`PF2E | Degree of success adjustment for type '${type}' is not implemented.`);
            }
        } else {
            console.warn(
                'PF2E | Degree of success adjustment requires a selector field, a type field and an adjustment object.',
            );
        }
    }

    skillAbbreviationFromString(skill: string): SkillAbbreviation | undefined {
        for (const [key, value] of Object.entries(SKILL_DICTIONARY)) {
            if (value === skill) {
                return key as SkillAbbreviation;
            }
        }
        return;
    }

    isAdjustmentData(adjustment: PF2CheckDCModifiers): boolean {
        const adjusts = ['criticalFailure', 'failure', 'success', 'criticalSuccess', 'all'];
        const modifiers = ['one-degree-better', 'one-degree-worse'];

        for (const [key, value] of Object.entries(adjustment)) {
            if (!adjusts.includes(key) || !modifiers.includes(value)) {
                return false;
            }
        }

        return true;
    }
}
