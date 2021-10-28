import { EffectPF2e, ItemPF2e } from "@item";
import { RuleElementPF2e } from "@module/rules/rule-element";
import { EffectTargetData, EffectTargetSource } from "./data";
import { TargetPrompt } from "./prompt";

/**
 * Present a set of options to the user and assign their selection to an injectable property
 * @category RuleElement
 */
class EffectTargetRuleElement extends RuleElementPF2e {
    constructor(data: EffectTargetSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        // Pass the targetId to the parent effect item so that it may be referenced by other rule elements on the
        // same item.
        if (typeof data.targetId === "string" && item instanceof EffectPF2e) {
            item.data.data.target = data.targetId;
        }
    }

    /**
     * Adjust the effect's name and set the targetId from the user's selection, or set the entire rule element to be
     * ignored if no selection was made.
     */
    override async preCreate(source: EffectTargetSource): Promise<void> {
        if (!(this.item instanceof EffectPF2e)) return;
        const targetItem = await new TargetPrompt(source, { item: this.item }).resolveTarget();
        if (targetItem) {
            source.targetId = targetItem.id;
            const effectName = this.item.data._source.name;
            this.item.data._source.name = `${effectName} (${targetItem.name})`;
        } else {
            source.ignored = true;
        }
    }
}

interface EffectTargetRuleElement extends RuleElementPF2e {
    data: EffectTargetData;
}

export { EffectTargetRuleElement };
