import { RuleElementPF2e } from "../rule-element";
import { CharacterData, NPCData } from "@actor/data";
import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/data/values";
import { SkillAbbreviation } from "@actor/creature/data";
import { DegreeOfSuccessAdjustment, PF2CheckDCModifiers } from "@system/check-degree-of-success";
import { ModifierPredicate } from "@module/modifiers";
import { RuleElementData } from "../rules-data-definitions";
import { tupleHasValue } from "@module/utils";

/**
 * @category RuleElement
 */
export class PF2AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e {
    override onAfterPrepareData(actorData: CharacterData | NPCData) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const adjustment = this.data.adjustment;

        if (selector && adjustment && typeof adjustment === "object") {
            if (!this.isAdjustmentData(adjustment)) {
                console.warn("PF2E | Degree of success adjustment does not have the correct format.", adjustment);
            }
            const completeAdjustment: DegreeOfSuccessAdjustment = {
                modifiers: adjustment,
            };
            if (this.data.predicate) {
                completeAdjustment.predicate = new ModifierPredicate(this.data.predicate);
            }

            const skill = this.skillAbbreviationFromString(selector);
            const save = tupleHasValue(SAVE_TYPES, selector) ? selector : undefined;
            if (selector === "saving-throw" || save) {
                if (selector === "saving-throw") {
                    SAVE_TYPES.forEach((save) => {
                        actorData.data.saves[save].adjustments ??= [];
                        actorData.data.saves[save].adjustments.push(completeAdjustment);
                    });
                } else if (save) {
                    actorData.data.saves[save].adjustments ??= [];
                    actorData.data.saves[save].adjustments.push(completeAdjustment);
                }
            } else if (selector === "skill-check" || skill !== undefined) {
                if (selector === "skill-check") {
                    Object.keys(actorData.data.skills).forEach((key) => {
                        const skill = key as SkillAbbreviation;
                        actorData.data.skills[skill].adjustments ??= [];
                        actorData.data.skills[skill].adjustments.push(completeAdjustment);
                    });
                } else if (skill) {
                    actorData.data.skills[skill].adjustments ??= [];
                    actorData.data.skills[skill].adjustments.push(completeAdjustment);
                }
            } else if (selector === "perception-check") {
                actorData.data.attributes.perception.adjustments ??= [];
                actorData.data.attributes.perception.adjustments.push(completeAdjustment);
            } else if (selector === "attack-roll") {
                actorData.data.actions.forEach((action) => {
                    action.adjustments ??= [];
                    action.adjustments.push(completeAdjustment);
                });
            } else {
                console.warn(`PF2E | Degree of success adjustment for selector '${selector}' is not implemented.`);
            }
        } else {
            console.warn(
                "PF2E | Degree of success adjustment requires a selector field, a type field and an adjustment object."
            );
        }
    }

    skillAbbreviationFromString(skill: string): SkillAbbreviation | undefined {
        for (const key of SKILL_ABBREVIATIONS) {
            if (SKILL_DICTIONARY[key] === skill) {
                return key;
            }
        }
        return;
    }

    isAdjustmentData(adjustment: PF2CheckDCModifiers): boolean {
        const adjusts = ["criticalFailure", "failure", "success", "criticalSuccess", "all"];
        const modifiers = ["one-degree-better", "one-degree-worse"];

        for (const [key, value] of Object.entries(adjustment)) {
            if (!adjusts.includes(key) || !modifiers.includes(value)) {
                return false;
            }
        }

        return true;
    }
}

export interface PF2AdjustDegreeOfSuccessRuleElement {
    data: RuleElementData & {
        adjustment?: PF2CheckDCModifiers;
    };
}
