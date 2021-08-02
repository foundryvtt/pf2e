import { RuleElementPF2e } from "../rule-element";
import { RuleElementSynthetics } from "../rules-data-definitions";
import { CharacterData, NPCData } from "@actor/data";
import { ModifierPF2e, ModifierPredicate, MODIFIER_TYPE } from "@module/modifiers";
import { ActorPF2e } from "@actor";

/**
 * @category RuleElement
 */
export class PF2FlatModifierRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData, { statisticsModifiers }: RuleElementSynthetics) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const resolvedValue = this.resolveValue(this.data.value);
        const value = Math.clamped(resolvedValue, this.data.min ?? resolvedValue, this.data.max ?? resolvedValue);
        if (selector && value) {
            const modifier = new ModifierPF2e(
                this.data.name ?? this.label,
                value,
                this.data.type ?? MODIFIER_TYPE.UNTYPED
            );
            modifier.label = this.label;
            if (this.data.damageType) {
                modifier.damageType = this.data.damageType;
            }
            if (this.data.damageCategory) {
                modifier.damageCategory = this.data.damageCategory;
            }
            if (this.data.predicate) {
                modifier.predicate = new ModifierPredicate(this.data.predicate);
                modifier.ignored = !ModifierPredicate.test(
                    modifier.predicate,
                    ActorPF2e.getRollOptions(actorData.flags, this.data["roll-options"] ?? [])
                );
            }
            statisticsModifiers[selector] = (statisticsModifiers[selector] || []).concat(modifier);
        } else if (value === 0) {
            // omit modifiers with a value of zero
        } else if (CONFIG.debug.ruleElement) {
            console.warn(
                "PF2E | Flat modifier requires at least a selector field, a label field or item name, and a value field",
                this.data,
                this.item,
                actorData
            );
        }
    }
}

export interface PF2FlatModifierRuleElement {
    data: RuleElementPF2e["data"] & {
        name?: string;
        min?: number;
        max?: number;
        type?: string;
        damageType?: string;
        damageCategory?: string;
        "roll-options"?: string[];
    };
}
