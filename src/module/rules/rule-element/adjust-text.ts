import { ItemPF2e } from "@item";
import { tupleHasValue } from "@util";
import { RuleElementData, RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./";

/**
 * Change the description text of an item.
 * @category RuleElement
 */
class AdjustTextRuleElement extends RuleElementPF2e {
    target: AdjustTextTarget;
    mode: AdjustTextChangeMode;
    text: string;

    static TARGETS = ["self", "granted-by"] as const;

    static CHANGE_MODES = ["add", "replace"] as const;

    constructor(data: AdjustTextSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.target = tupleHasValue(AdjustTextRuleElement.TARGETS, data.target) ? data.target : "self";
        this.mode = tupleHasValue(AdjustTextRuleElement.CHANGE_MODES, data.mode) ? data.mode : "add";
        this.text = typeof data.text === "string" ? data.text : "";
    }

    #resolveTarget(): Embedded<ItemPF2e> | null {
        switch (this.target) {
            case "self": {
                return this.item;
            }
            case "granted-by": {
                const itemID = this.item.flags.pf2e.grantedBy?.id ?? "";
                const item = this.actor.items.get(itemID);
                return item || null;
            }
        }
    }

    protected validateData(): void {
        if (!tupleHasValue(AdjustTextRuleElement.TARGETS, this.data.target)) {
            return this.failValidation(`target property is missing or invalid`);
        }
        if (!tupleHasValue(AdjustTextRuleElement.CHANGE_MODES, this.data.mode)) {
            return this.failValidation(`mode property is missing or invalid`);
        }
        if (this.data.target === "granted-by" && !this.item.flags.pf2e.grantedBy) {
            return this.failValidation(`Item is not granted by another item`);
        }
    }

    override beforePrepareData(rollOptions = new Set(this.actor.getRollOptions())): void {
        this.validateData();
        if (!this.test(rollOptions)) return;

        const targetItem = this.#resolveTarget();
        if (targetItem === null) {
            return this.failValidation(`Target item does not exist`);
        }

        if (this.mode === "add") {
            targetItem.system.description.value += this.text;
        } else if (this.mode === "replace") {
            targetItem.system.description.value = this.text;
        }
    }
}

interface AdjustTextRuleElement extends RuleElementPF2e {
    data: AdjustTextData;
}

type AdjustTextTarget = "self" | "granted-by";
type AdjustTextChangeMode = "add" | "replace";

interface AdjustTextData extends RuleElementData {
    target: AdjustTextTarget;
    mode: AdjustTextChangeMode;
}

interface AdjustTextSource extends RuleElementSource {
    target?: unknown;
    mode?: unknown;
    text?: unknown;
}

export { AdjustTextData, AdjustTextRuleElement, AdjustTextSource };
