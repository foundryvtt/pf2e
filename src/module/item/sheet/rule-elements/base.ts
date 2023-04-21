import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item/base.ts";
import { RuleElementPF2e, RuleElementSource } from "@module/rules/index.ts";

/** Utility function to convert a value to a number if its a valid number */
function coerceNumber<T extends string | unknown>(value: T): T | number {
    if (value !== "" && !isNaN(Number(value))) {
        return Number(value);
    }

    return value;
}

interface RuleElementFormOptions<TSource extends RuleElementSource, TObject extends RuleElementPF2e> {
    item: ItemPF2e<ActorPF2e>;
    index: number;
    rule: TSource;
    object: TObject | null;
}

/** Base Rule Element form handler. Form handlers intercept sheet events to support new UI */
class RuleElementForm<
    TSource extends RuleElementSource = RuleElementSource,
    TObject extends RuleElementPF2e = RuleElementPF2e
> {
    template = "systems/pf2e/templates/items/rules/default.hbs";

    readonly item: ItemPF2e<ActorPF2e>;
    readonly index: number;
    readonly rule: TSource;
    readonly object: TObject | null;

    constructor(protected options: RuleElementFormOptions<TSource, TObject>) {
        this.item = options.item;
        this.index = options.index;
        this.rule = options.rule;
        this.object = options.object;
    }

    async getData(): Promise<RuleElementFormSheetData<TSource, TObject>> {
        return this.options;
    }

    async render(): Promise<string> {
        const data = await this.getData();
        return renderTemplate(this.template, data);
    }

    /**
     * Helper to update the item with the new rule data.
     * This function exists because array updates in foundry are currently clunky
     */
    updateItem(updates: Partial<TSource>): void {
        const rules: Record<string, unknown>[] = this.item.toObject().system.rules;
        rules[this.index] = mergeObject(this.rule, updates, { performDeletions: true });
        this.item.update({ [`system.rules`]: rules });
    }

    activateListeners(_html: HTMLElement): void {}
    _updateObject(_formData: Partial<Record<string, unknown>>): void {}
}

type RuleElementFormSheetData<
    TSource extends RuleElementSource,
    TObject extends RuleElementPF2e
> = RuleElementFormOptions<TSource, TObject>;

export { RuleElementForm, RuleElementFormSheetData, coerceNumber };
