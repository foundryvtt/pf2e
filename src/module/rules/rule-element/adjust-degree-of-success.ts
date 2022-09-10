import { CharacterPF2e, NPCPF2e } from "@actor";
import { SkillAbbreviation } from "@actor/creature/data";
import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/values";
import { ItemPF2e } from "@item";
import { CheckDCModifiers, DegreeOfSuccessAdjustment } from "@system/degree-of-success";
import { tupleHasValue } from "@util";
import { RuleElementData, RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./";

/**
 * @category RuleElement
 */
class AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e {
    selector: string;

    constructor(data: AdjustDegreeOfSuccessSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        if (typeof data.selector === "string") {
            this.selector = data.selector;
        } else {
            this.failValidation("Missing string selector property");
            this.selector = "";
        }
    }

    override afterPrepareData() {
        const selector = this.resolveInjectedProperties(this.selector);
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
                    Object.keys(this.actor.system.skills).forEach((key) => {
                        const skill = key as SkillAbbreviation;
                        const adjustments = (this.actor.system.skills[skill].adjustments ??= []);
                        adjustments.push(completeAdjustment);
                    });
                } else if (skill) {
                    const adjustments = (this.actor.system.skills[skill].adjustments ??= []);
                    adjustments.push(completeAdjustment);
                }
            } else if (selector === "perception-check") {
                this.actor.system.attributes.perception.adjustments ??= [];
                this.actor.system.attributes.perception.adjustments.push(completeAdjustment);
            } else if (selector === "attack-roll") {
                this.actor.system.actions.forEach((action) => {
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

interface AdjustDegreeOfSuccessSource extends RuleElementSource {
    selector?: unknown;
}

export { AdjustDegreeOfSuccessRuleElement };
