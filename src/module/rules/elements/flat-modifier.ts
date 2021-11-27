import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSource, RuleElementSynthetics } from "../rules-data-definitions";
import { ModifierPF2e, MODIFIER_TYPE } from "@module/modifiers";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";

/**
 * Apply a constant modifier (or penalty/bonus) to a statistic or usage thereof
 * @category RuleElement
 */
class FlatModifierRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    constructor(data: FlatModifierSource, item: Embedded<ItemPF2e>) {
        if (data["roll-options"] && !Array.isArray(data["roll-options"])) {
            console.warn(`FlatModifier rule element from item ${item.name} (${item.uuid}) has malformed roll options.`);
            data.ignored = true;
        }

        super(data, item);
    }

    override onBeforePrepareData(_actorData: unknown, { statisticsModifiers }: RuleElementSynthetics) {
        if (this.ignored) return;

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
                modifier.damageType = this.resolveInjectedProperties(this.data.damageType);
            }
            if (this.data.damageCategory) {
                modifier.damageCategory = this.data.damageCategory;
            }
            if (this.data.predicate) {
                modifier.predicate = this.data.predicate;
            }
            statisticsModifiers[selector] = (statisticsModifiers[selector] || []).concat(modifier);
        } else if (value === 0) {
            // omit modifiers with a value of zero
        } else if (CONFIG.debug.ruleElement) {
            console.warn(
                "PF2E | Flat modifier requires at least a selector field, a label field or item name, and a value field",
                this.data,
                this.item,
                this.actor.data
            );
        }
    }
}

interface FlatModifierRuleElement {
    data: FlatModifierData;
}

interface FlatModifierSource extends RuleElementSource {
    name?: unknown;
    min?: unknown;
    max?: unknown;
    type?: unknown;
    damageType?: unknown;
    damageCategory?: unknown;
    "roll-options"?: unknown;
}

interface FlatModifierData extends RuleElementData {
    name?: string;
    min?: number;
    max?: number;
    type?: string;
    damageType?: string;
    damageCategory?: string;
    "roll-options"?: string[];
}

export { FlatModifierRuleElement };
