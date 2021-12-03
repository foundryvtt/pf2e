import { EffectPF2e, ItemPF2e } from "@item";
import { RuleElementPF2e } from "@module/rules/rule-element";
import { REPreCreateParameters } from "@module/rules/rules-data-definitions";
import { EffectTargetData, EffectTargetSource } from "./data";
import { EffectTargetPrompt } from "./prompt";

/**
 * Present a set of options to the user and assign their selection to an injectable property
 * @category RuleElement
 */
class EffectTargetRuleElement extends RuleElementPF2e {
    constructor(data: EffectTargetSource, item: Embedded<ItemPF2e>) {
        data.predicate ??= { all: ["weapon:equipped"] };
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
    override async preCreate({ ruleSource }: REPreCreateParameters<EffectTargetSource>): Promise<void> {
        if (!(this.item instanceof EffectPF2e)) return;
        const selection = await new EffectTargetPrompt({
            predicate: this.data.predicate,
            scope: this.data.scope ?? "weapon",
            item: this.item,
        }).resolveSelection();
        if (selection) {
            ruleSource.targetId = selection.value.id;
            const effectName = this.item.data._source.name;
            this.item.data._source.name = `${effectName} (${selection.value.name})`;
        } else {
            ruleSource.ignored = true;
        }
    }
}

interface EffectTargetRuleElement extends RuleElementPF2e {
    item: Embedded<EffectPF2e>;

    data: EffectTargetData;
}

export { EffectTargetRuleElement };
