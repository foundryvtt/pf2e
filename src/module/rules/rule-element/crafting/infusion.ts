import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "..";
import { ItemPF2e } from "@item";
import { CharacterPF2e } from "@actor";

/**
 * @category RuleElement
 */
class CraftingInfusionRuleElement extends RuleElementPF2e {
    private selector: string;

    constructor(data: CraftingInfusionRuleSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);
        this.selector = String(this.resolveValue(this.data.selector));
    }

    override afterPrepareData(): void {
        const entry = this.actor.system.crafting.entries[this.selector];
        if (!entry) return;

        if (!entry.infusionRules) {
            entry.infusionRules = [];
        }

        entry.infusionRules?.push(this);
    }

    getBatchSize(item: ItemPF2e): number | undefined {
        const options = item.getRollOptions();
        if (!this.data.predicate?.test(options) ?? false) return;

        const batchSize = Number(this.resolveValue(this.data.batchSize, 2));

        return batchSize;
    }
}

interface CraftingInfusionRuleElement extends RuleElementPF2e {
    data: CraftingInfusionruleData;

    get actor(): CharacterPF2e;
}

interface CraftingInfusionRuleSource extends RuleElementSource {
    batchSize?: unknown;
}

interface CraftingInfusionruleData extends RuleElementData {
    batchSize: number;
}

export { CraftingInfusionRuleElement };
