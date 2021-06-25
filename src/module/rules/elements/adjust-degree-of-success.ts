import { RuleElementPF2e } from '../rule-element';
import { CharacterData, NPCData } from '@actor/data';
import { SAVE_TYPES, SKILL_DICTIONARY } from '@actor/data/values';
import { Saves, SkillAbbreviation } from '@actor/creature/data';
import { DegreeOfSuccessAdjustment, PF2CheckDCModifiers } from '@system/check-degree-of-success';
import { ModifierPredicate } from '@module/modifiers';

/**
 * @category RuleElement
 */
export class PF2AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e {
    override onAfterPrepareData(actorData: CharacterData | NPCData) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const adjustment = this.ruleData.adjustment as PF2CheckDCModifiers;

        if (selector && adjustment && typeof adjustment === 'object') {
            if (!this.isAdjustmentData(adjustment)) {
                console.warn('PF2E | Degree of success adjustment does not have the correct format.', adjustment);
            }
            const completeAdjustment: DegreeOfSuccessAdjustment = {
                modifiers: adjustment,
            };
            if (this.ruleData.predicate) {
                completeAdjustment.predicate = new ModifierPredicate(this.ruleData.predicate);
            }

            const skill = this.skillAbbreviationFromString(selector);
            const save = SAVE_TYPES.includes(selector as keyof Saves) ? (selector as keyof Saves) : undefined;
            if (selector === 'saving-throw' || save !== undefined) {
                if (selector === 'saving-throw') {
                    SAVE_TYPES.forEach((save) => {
                        actorData.data.saves[save].adjustments ??= [];
                        actorData.data.saves[save].adjustments.push(completeAdjustment);
                    });
                } else {
                    actorData.data.saves[save!].adjustments ??= [];
                    actorData.data.saves[save!].adjustments.push(completeAdjustment);
                }
            } else if (selector === 'skill-check' || skill !== undefined) {
                if (selector === 'skill-check') {
                    Object.keys(actorData.data.skills).forEach((key) => {
                        const skill = key as SkillAbbreviation;
                        actorData.data.skills[skill].adjustments ??= [];
                        actorData.data.skills[skill].adjustments.push(completeAdjustment);
                    });
                } else {
                    actorData.data.skills[skill!].adjustments ??= [];
                    actorData.data.skills[skill!].adjustments.push(completeAdjustment);
                }
            } else if (selector === 'perception-check') {
                actorData.data.attributes.perception.adjustments ??= [];
                actorData.data.attributes.perception.adjustments.push(completeAdjustment);
            } else if (selector === 'attack-roll') {
                actorData.data.actions.forEach((action) => {
                    action.adjustments ??= [];
                    action.adjustments.push(completeAdjustment);
                });
            } else {
                console.warn(`PF2E | Degree of success adjustment for selector '${selector}' is not implemented.`);
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
