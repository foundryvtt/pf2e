import { RuleElementPF2e, RuleElementData } from "./";
import { CharacterPF2e, NPCPF2e } from "@actor";
import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/data/values";
import { SkillAbbreviation } from "@actor/creature/data";
import { DegreeOfSuccessAdjustment, CheckDCModifiers } from "@system/degree-of-success";
import { tupleHasValue } from "@util";

/**
 * @category RuleElement
 */
class AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e {
    override afterPrepareData() {
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
                completeAdjustment.predicate = this.data.predicate;
            }

            const skill = this.skillAbbreviationFromString(selector);
            const saveType = tupleHasValue(SAVE_TYPES, selector) ? selector : undefined;
            const actorData = this.actor.data;
            if (selector === "saving-throw") {
                SAVE_TYPES.forEach((saveType) => {
                    const save = this.actor.saves[saveType];
                    const adjustments = (save.data.check.adjustments ??= []);
                    adjustments.push(completeAdjustment);
                });
            } else if (saveType) {
                const save = this.actor.saves[saveType];
                const adjustments = (save.data.check.adjustments ??= []);
                adjustments.push(completeAdjustment);
            } else if (selector === "skill-check" || skill !== undefined) {
                if (selector === "skill-check") {
                    Object.keys(actorData.data.skills).forEach((key) => {
                        const skill = key as SkillAbbreviation;
                        const adjustments = (actorData.data.skills[skill].adjustments ??= []);
                        adjustments.push(completeAdjustment);
                    });
                } else if (skill) {
                    const adjustments = (actorData.data.skills[skill].adjustments ??= []);
                    adjustments.push(completeAdjustment);
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

    isAdjustmentData(adjustment: CheckDCModifiers): boolean {
        const adjusts = ["criticalFailure", "failure", "success", "criticalSuccess", "all"];
        const modifiers = ["one-degree-better", "one-degree-worse"];
        return Object.entries(adjustment).every(([key, value]) => adjusts.includes(key) && modifiers.includes(value));
    }
}

interface AdjustDegreeOfSuccessRuleElement {
    data: RuleElementData & {
        adjustment?: CheckDCModifiers;
    };

    get actor(): CharacterPF2e | NPCPF2e;
}

export { AdjustDegreeOfSuccessRuleElement };
