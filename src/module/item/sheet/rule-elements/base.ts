import { ItemPF2e } from "@item/base";
import { RuleElementSource } from "@module/rules";

/** Utility function to convert a value to a number if its a valid number */
function coerceNumber<T extends string | unknown>(value: T): T | number {
    if (value !== "" && !isNaN(Number(value))) {
        return Number(value);
    }

    return value;
}

/** Base Rule Element form handler. Form handlers intercept sheet events to support new UI */
class RuleElementForm<TSource extends RuleElementSource = RuleElementSource> {
    template = "systems/pf2e/templates/items/rules/default.html";
    constructor(protected item: ItemPF2e, protected index: number, protected rule: TSource) {}
    async getData() {
        return {
            index: this.index,
            rule: this.rule,
        };
    }

    async render() {
        const data = await this.getData();
        return renderTemplate(this.template, data);
    }

    /**
     * Helper to update the item with the new rule data.
     * This function exists because array updates in foundry are currently clunky
     */
    updateItem(updates: Partial<TSource>) {
        const rules: Record<string, unknown>[] = this.item.toObject().system.rules;
        rules[this.index] = mergeObject(this.rule, updates, { performDeletions: true });
        this.item.update({ [`system.rules`]: rules });
    }

    activateListeners(_html: HTMLElement) {}
    _updateObject(_formData: Partial<Record<string, unknown>>) {}
}

export { RuleElementForm, coerceNumber };
