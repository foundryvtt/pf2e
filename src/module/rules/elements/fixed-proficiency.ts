import { AbilityString, CharacterData, NPCData } from "@actor/data";
import { ABILITY_ABBREVIATIONS, SKILL_EXPANDED } from "@actor/data/values";
import { ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@module/modifiers";
import { objectHasKey, tupleHasValue } from "@module/utils";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSynthetics } from "../rules-data-definitions";

const KNOWN_TARGETS: Record<string, { ability: AbilityString; shortform: "ac" }> = {
    ac: { ability: "dex" as const, shortform: "ac" },
};

/**
 * @category RuleElement
 */
export class PF2FixedProficiencyRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData, { statisticsModifiers }: RuleElementSynthetics) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        let value = this.resolveValue(this.data.value);
        if (selector === "ac") {
            // Special case for AC so the rule elements match what's written in the book
            value -= 10;
        }

        const ability =
            (this.data.ability && String(this.data.ability).trim()) ||
            (KNOWN_TARGETS[selector]?.ability ?? SKILL_EXPANDED[selector]?.ability);

        if (!tupleHasValue(ABILITY_ABBREVIATIONS, ability)) {
            console.warn("PF2E | Fixed modifier requires an ability field, or a known selector.");
        } else if (!value) {
            console.warn("PF2E | Fixed modifier requires at least a non-zero value or formula field.");
        } else {
            const modifier = new ModifierPF2e(
                this.data.name ?? this.label,
                value - actorData.data.abilities[ability].mod,
                MODIFIER_TYPE.PROFICIENCY
            );
            modifier.label = this.label;
            statisticsModifiers[selector] = (statisticsModifiers[selector] || []).concat(modifier);
        }
    }

    override onAfterPrepareData(actorData: CharacterData | NPCData) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const { data } = actorData;
        const skill: string = SKILL_EXPANDED[selector]?.shortform ?? selector;
        const skills: Record<string, StatisticModifier> = data.skills;
        const target = skills[skill] ?? (objectHasKey(data.attributes, skill) ? data.attributes[skill] : null);
        const force = this.data.force;

        if (target instanceof StatisticModifier) {
            for (const modifier of target.modifiers) {
                const itemOrUntyped: string[] = [MODIFIER_TYPE.ITEM, MODIFIER_TYPE.UNTYPED];
                if (itemOrUntyped.includes(modifier.type) && modifier.modifier > 0) {
                    modifier.ignored = true;
                }
                if (force && modifier.type === MODIFIER_TYPE.PROFICIENCY && modifier.name !== this.label) {
                    modifier.ignored = true;
                }
            }
            target.applyStackingRules();
            target.value = target.totalModifier + (skill === "ac" ? 10 : 0);
        }
    }
}

export interface PF2FixedProficiencyRuleElement {
    data: RuleElementData & {
        name?: string;
        ability?: string;
        force?: boolean;
    };
}
