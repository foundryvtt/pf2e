import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item/base.ts";
import { RuleElementPF2e, RuleElementSource, RuleElements } from "@module/rules/index.ts";
import { ResolvableValueField, RuleElementSchema } from "@module/rules/rule-element/data.ts";
import { LaxSchemaField } from "@system/schema-data-fields.ts";
import { htmlQuery, isObject, tagify } from "@util";
import * as R from "remeda";
import { type DataField } from "types/foundry/common/data/fields.js";

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
    schema: LaxSchemaField<RuleElementSchema> | null;

    constructor(protected options: RuleElementFormOptions<TSource, TObject>) {
        this.item = options.item;
        this.index = options.index;
        this.rule = options.rule;
        this.object = options.object;
        this.schema = RuleElements.all[String(this.rule.key)]?.schema ?? null;
    }

    /** Returns the initial value of the schema. Arrays are stripped due to how they're handled in forms */
    protected getInitialValue(): object {
        const initial: Partial<SourceFromSchema<RuleElementSchema>> | undefined = this.schema?.getInitialValue();
        if (!initial) return {};
        for (const property of ["ignored", "priority", "slug"] as const) {
            delete initial[property];
        }

        const removeArrays = (object: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(object)) {
                if (Array.isArray(value)) {
                    delete object[key];
                } else if (isObject<Record<string, unknown>>(value)) {
                    removeArrays(value);
                }
            }
        };
        removeArrays(initial);

        return initial;
    }

    async getData(): Promise<RuleElementFormSheetData<TSource, TObject>> {
        return {
            ...this.options,
            rule: mergeObject(this.getInitialValue() ?? {}, this.rule),
        };
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

    activateListeners(html: HTMLElement): void {
        // Tagify selectors lists
        const selectorElement = htmlQuery<HTMLInputElement>(html, ".selector-list");
        tagify(selectorElement);
    }

    updateObject(formData: Partial<RuleElementSource> & Record<string, unknown>): void {
        // Predicate is special cased as always json. Later on extend such parsing to more things
        const predicateValue = formData.predicate;
        if (typeof predicateValue === "string") {
            if (predicateValue.trim() === "") {
                delete formData.predicate;
            } else {
                try {
                    formData.predicate = JSON.parse(predicateValue);
                } catch (error) {
                    if (error instanceof Error) {
                        ui.notifications.error(
                            game.i18n.format("PF2E.ErrorMessage.RuleElementSyntax", { message: error.message })
                        );
                        throw error; // prevent update, to give the user a chance to correct, and prevent bad data
                    }
                }
            }
        }

        if (this.schema) {
            cleanDataUsingSchema(this.schema.fields, formData);
        }
    }
}

/** Recursively clean and remove all fields that have a default value */
function cleanDataUsingSchema(schema: Record<string, DataField>, data: Record<string, unknown>) {
    const { fields } = foundry.data;
    for (const [key, field] of Object.entries(schema)) {
        if (!(key in data)) continue;

        if (field instanceof ResolvableValueField) {
            data[key] = getCleanedResolvable(data[key]);
            continue;
        }

        if ("fields" in field) {
            cleanDataUsingSchema(field.fields as Record<string, DataField>, data);
            continue;
        }

        // Allow certain field types to clean the data. Unfortunately we cannot do it to all.
        // Arrays need to allow string inputs (some selectors) and StrictArrays are explodey
        // The most common benefit from clean() is handling things like the "blank" property
        if (field instanceof fields.StringField) {
            data[key] = field.clean(data[key], {});
        }

        // Remove if its the initial value, or if its a blank string for an array field (usually a selector)
        const value = data[key];
        const isBlank = typeof value === "string" && value.trim() === "";
        const isInitial = "initial" in field && R.equals(field.initial, value);
        if (isInitial || (field instanceof fields.ArrayField && isBlank)) {
            delete data[key];
        }
    }
}

/** Utility function to convert a value to a number if its a valid number */
function coerceNumber<T extends string | unknown>(value: T): T | number {
    if (value !== "" && !isNaN(Number(value))) {
        return Number(value);
    }

    return value;
}

function getCleanedResolvable(value: unknown) {
    // Convert brackets to array, and coerce the value types
    if (isObject<{ brackets: object; field: string }>(value) && "brackets" in value) {
        const brackets = (value.brackets = Array.from(Object.values(value.brackets ?? {})));

        if (value.field === "") {
            delete value.field;
        }

        for (const bracket of brackets) {
            if (bracket.start === null) delete bracket.start;
            if (bracket.end === null) delete bracket.end;
            bracket.value = isObject(bracket.value) ? "" : coerceNumber(bracket.value);
        }

        return value;
    } else if (!isObject(value)) {
        return coerceNumber(value ?? "");
    }

    return value;
}

type RuleElementFormSheetData<
    TSource extends RuleElementSource,
    TObject extends RuleElementPF2e
> = RuleElementFormOptions<TSource, TObject>;

export { RuleElementForm, coerceNumber, type RuleElementFormSheetData };
