import { ActorProxyPF2e } from "@actor";
import { ItemPF2e, ItemProxyPF2e } from "@item";
import { isBracketedValue } from "@module/rules/helpers.ts";
import { RuleElements, type RuleElementPF2e, type RuleElementSource } from "@module/rules/index.ts";
import { ResolvableValueField, RuleElementSchema } from "@module/rules/rule-element/data.ts";
import type { LaxSchemaField } from "@system/schema-data-fields.ts";
import { createHTMLElement, fontAwesomeIcon, htmlClosest, htmlQuery, htmlQueryAll, isObject, tagify } from "@util";
import * as R from "remeda";
import type { DataField } from "types/foundry/common/data/fields.d.ts";
import type { ItemSheetPF2e } from "../index.ts";

interface RuleElementFormOptions<TSource extends RuleElementSource, TObject extends RuleElementPF2e | null> {
    sheet: ItemSheetPF2e<ItemPF2e>;
    index: number;
    rule: TSource;
    object: TObject;
}

/** Base Rule Element form handler. Form handlers intercept sheet events to support new UI */
class RuleElementForm<
    TSource extends RuleElementSource = RuleElementSource,
    TObject extends RuleElementPF2e | null = RuleElementPF2e | null,
> {
    template = "systems/pf2e/templates/items/rules/default.hbs";

    declare sheet: ItemSheetPF2e<ItemPF2e>;
    declare index: number;
    declare rule: TSource;
    declare object: TObject;
    declare schema: LaxSchemaField<RuleElementSchema> | null;
    declare element: HTMLElement;

    /** Tab configuration data */
    protected tabs: RuleElementFormTabData | null = null;
    /** The currently active tab */
    #activeTab: Maybe<string> = null;

    /** Base proprety path for the contained rule */
    get basePath(): string {
        return `system.rules.${this.index}`;
    }

    constructor(options: RuleElementFormOptions<TSource, TObject>) {
        this.initialize(options);
    }

    initialize(options: RuleElementFormOptions<TSource, TObject>): void {
        this.sheet = options.sheet;
        this.index = options.index;
        this.rule = options.rule;
        this.object =
            options.object ??
            // If this rule element is on an unowned item, create a temporary owned item for it
            (() => {
                const RuleElementClass = RuleElements.all[String(this.rule.key)];
                if (!RuleElementClass) return null as TObject;
                const actor = new ActorProxyPF2e({ _id: randomID(), name: "temp", type: "character" });
                const item = new ItemProxyPF2e(this.item.toObject(), { parent: actor });
                return new RuleElementClass(deepClone(this.rule), {
                    parent: item,
                    strict: false,
                    suppressWarnings: true,
                }) as TObject;
            })();

        this.schema = this.object?.schema ?? RuleElements.all[String(this.rule.key)]?.schema ?? null;
    }

    get item(): ItemPF2e {
        return this.sheet.item;
    }

    get fieldIdPrefix(): string {
        return `field-${this.sheet.appId}-${this.index}-`;
    }

    /** Returns the initial value of the schema. Arrays are stripped due to how they're handled in forms */
    protected getInitialValue(): object {
        // Only apply to real forms for now
        if (this.constructor.name === "RuleElementForm") return {};

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
        const [label, recognized] = ((): [string, boolean] => {
            const locPath = `PF2E.RuleElement.${this.rule.key}`;
            const localized = game.i18n.localize(locPath);
            return localized === locPath
                ? [game.i18n.localize("PF2E.RuleElement.Unrecognized"), false]
                : [localized, true];
        })();
        const mergedRule = mergeObject(this.getInitialValue(), this.rule);

        return {
            ...R.pick(this, ["index", "rule", "object"]),
            item: this.item,
            label,
            fieldIdPrefix: this.fieldIdPrefix,
            recognized,
            basePath: this.basePath,
            rule: mergedRule,
            fields: this.schema?.fields,
            form: await this.#getFormHelpers(mergedRule),
        };
    }

    async #getFormHelpers(rule: TSource): Promise<Record<string, unknown>> {
        const valueTemplate = await getTemplate("systems/pf2e/templates/items/rules/partials/resolvable-value.hbs");
        const bracketsTemplate = await getTemplate(
            "systems/pf2e/templates/items/rules/partials/resolvable-brackets.hbs",
        );
        const dropZoneTemplate = await getTemplate("systems/pf2e/templates/items/rules/partials/drop-zone.hbs");

        const getResolvableData = (property: string) => {
            const value = getProperty(rule, property);
            const mode = isBracketedValue(value) ? "brackets" : isObject(value) ? "object" : "primitive";
            return { value, mode, property, path: `${this.basePath}.${property}` };
        };

        return {
            resolvableValue: (property: string, options: { hash?: { fileInput?: boolean } } = {}) =>
                valueTemplate({
                    ...getResolvableData(property),
                    inputId: `${this.fieldIdPrefix}${property}`,
                    fileInput: options.hash?.fileInput ?? false,
                }),

            resolvableAddBracket: (property: string) => {
                const data = getResolvableData(property);
                if (data.mode !== "brackets") return "";
                return createHTMLElement("a", {
                    children: [fontAwesomeIcon("plus", { fixedWidth: true })],
                    dataset: { action: "add-bracket", property },
                }).outerHTML;
            },
            resolvableBrackets: (property: string) => {
                return bracketsTemplate(getResolvableData(property));
            },
            dropZone: (dropId: string, dropText: string, dropTooltip?: string) => {
                return dropZoneTemplate({ dropId, dropText, dropTooltip });
            },
        };
    }

    async render(): Promise<string> {
        const data = await this.getData();
        return renderTemplate("systems/pf2e/templates/items/rules/partials/outer.hbs", {
            ...data,
            template: await renderTemplate(this.template, data),
        });
    }

    /**
     * Helper to update the item with the new rule data.
     * This function exists because array updates in foundry are currently clunky
     */
    async updateItem(updates: Partial<TSource> | Record<string, unknown>): Promise<void> {
        const rules: Record<string, unknown>[] = this.item.toObject().system.rules;
        const result = mergeObject(this.rule, updates, { performDeletions: true });
        if (this.schema) {
            cleanDataUsingSchema(this.schema.fields, result);
        }
        rules[this.index] = result;
        await this.item.update({ [`system.rules`]: rules });
    }

    activateListeners(html: HTMLElement): void {
        this.element = html;

        // Tagify selectors lists
        const selectorElement = htmlQuery<HTMLInputElement>(html, ".selector-list");
        tagify(selectorElement);

        // Add event listener for priority. This exists because normal form submission won't work for text-area forms
        const priorityInput = htmlQuery<HTMLInputElement>(html, ".rule-element-header .priority input");
        priorityInput?.addEventListener("change", (event) => {
            event.stopPropagation();
            const value = priorityInput.value;
            if (value === "" || Number.isNaN(Number(value))) {
                this.updateItem({ "-=priority": null });
            } else {
                this.updateItem({ priority: Number(value) });
            }
        });

        for (const button of htmlQueryAll(html, "[data-action=toggle-brackets]")) {
            button.addEventListener("click", () => {
                const property = button.dataset.property ?? "value";
                const value = getProperty(this.rule, property);
                if (isBracketedValue(value)) {
                    this.updateItem({ [property]: "" });
                } else {
                    this.updateItem({ [property]: { brackets: [{ value: "" }] } });
                }
            });
        }

        for (const button of htmlQueryAll(html, "[data-action=add-bracket]")) {
            const property = button.dataset.property ?? "value";
            button.addEventListener("click", () => {
                const value = getProperty(this.rule, property);
                if (isBracketedValue(value)) {
                    value.brackets.push({ value: "" });
                    this.updateItem({ [property]: value });
                }
            });
        }

        for (const button of htmlQueryAll(html, "[data-action=delete-bracket]")) {
            const property = button.dataset.property ?? "value";
            button.addEventListener("click", () => {
                const value = getProperty(this.rule, property);
                const idx = Number(htmlClosest(button, "[data-idx]")?.dataset.idx);
                if (isBracketedValue(value)) {
                    value.brackets.splice(idx, 1);
                    this.updateItem({ [property]: value });
                }
            });
        }

        if (this.tabs) {
            for (const anchor of htmlQueryAll(html, "a[data-rule-tab]")) {
                anchor.addEventListener("click", () => {
                    this.activateTab(html, anchor.dataset.ruleTab);
                });
            }
            this.activateTab(html, this.#activeTab);
        }

        for (const dropZone of htmlQueryAll(html, "div.rules-drop-zone")) {
            dropZone.addEventListener("drop", (event) => {
                this.onDrop(event, dropZone);
            });
        }
    }

    protected async onDrop(event: DragEvent, _element: HTMLElement): Promise<ItemPF2e | null> {
        const data = event.dataTransfer?.getData("text/plain");
        if (!data) return null;
        const item = await ItemPF2e.fromDropData(JSON.parse(data));
        return item ?? null;
    }

    protected activateTab(html: HTMLElement, tabName: Maybe<string>): void {
        if (!this.tabs) return;
        const activeTab = tabName ?? this.tabs.names.at(0);
        if (!activeTab || !this.tabs.names.includes(activeTab)) return;
        this.#activeTab = activeTab;

        for (const element of htmlQueryAll(html, "[data-rule-tab]")) {
            if (element.dataset.ruleTab === activeTab) {
                element.classList.add("active");
                if (element.tagName !== "A") {
                    element.style.display = this.tabs.displayStyle;
                }
            } else {
                element.classList.remove("active");
                if (element.tagName !== "A") {
                    element.style.display = "none";
                }
            }
        }
    }

    updateObject(source: TSource & Record<string, unknown>): void {
        // If the entire thing is a string, this is a regular JSON textarea
        if (typeof source === "string") {
            try {
                this.rule = JSON.parse(source);
            } catch (error) {
                if (error instanceof Error) {
                    ui.notifications.error(
                        game.i18n.format("PF2E.ErrorMessage.RuleElementSyntax", { message: error.message }),
                    );
                    console.warn("Syntax error in rule element definition.", error.message, source);
                    throw error; // prevent update, to give the user a chance to correct, and prevent bad data
                }
            }

            return;
        }

        source = mergeObject(duplicate(this.rule), source);

        // Prevent wheel events on the sliders from spamming updates
        for (const slider of htmlQueryAll<HTMLInputElement>(this.element, "input[type=range")) {
            slider.style.pointerEvents = "none";
        }

        // Predicate is special cased as always json. Later on extend such parsing to more things
        cleanPredicate(source);

        if (this.schema) {
            cleanDataUsingSchema(this.schema.fields, source);
        }

        // Update our reference so that equality matching works on the next data prep cycle
        // This allows form reuse to occur
        this.rule = source;
    }
}

/** Recursively clean and remove all fields that have a default value */
function cleanDataUsingSchema(schema: Record<string, DataField>, data: Record<string, unknown>): void {
    const { fields } = foundry.data;

    // Removes the field if it is the initial value.
    // It may merge with the initial value to handle cases where the values where cleaned recursively
    const deleteIfInitial = (key: string, field: DataField): boolean => {
        if (data[key] === undefined) return true;
        const initialValue = typeof field.initial === "function" ? field.initial(data) : field.initial;
        const valueRaw = data[key];
        const value = R.isObject(valueRaw) && R.isObject(initialValue) ? { ...initialValue, ...valueRaw } : valueRaw;
        const isInitial = R.equals(initialValue, value);
        if (isInitial) delete data[key];
        return !(key in data);
    };

    for (const [key, field] of Object.entries(schema)) {
        if (deleteIfInitial(key, field)) continue;

        if (field instanceof ResolvableValueField) {
            data[key] = field.clean(data[key]);
            deleteIfInitial(key, field);
            continue;
        }

        if ("fields" in field) {
            const value = data[key];
            if (R.isObject(value)) {
                cleanDataUsingSchema(field.fields as Record<string, DataField>, value);
                deleteIfInitial(key, field);
                continue;
            }
        }

        if (field instanceof fields.ArrayField && field.element instanceof fields.SchemaField) {
            const value = data[key];
            if (Array.isArray(value)) {
                // Recursively clean schema fields inside an array
                for (const data of value) {
                    if (R.isObject(data)) {
                        if (data.predicate) {
                            cleanPredicate(data);
                        }
                        cleanDataUsingSchema(field.element.fields, data);
                    }
                }
                continue;
            }
        }

        // Allow certain field types to clean the data. Unfortunately we cannot do it to all.
        // Arrays need to allow string inputs (some selectors) and StrictArrays are explodey
        // The most common benefit from clean() is handling things like the "blank" property
        if (field instanceof fields.StringField) {
            data[key] = field.clean(data[key], {});
            deleteIfInitial(key, field);
        }
    }
}

function cleanPredicate(source: { predicate?: unknown }) {
    const predicateValue = source.predicate;
    if (typeof predicateValue === "string") {
        if (predicateValue.trim() === "") {
            delete source.predicate;
        } else {
            try {
                source.predicate = JSON.parse(predicateValue);
            } catch (error) {
                if (error instanceof Error) {
                    ui.notifications.error(
                        game.i18n.format("PF2E.ErrorMessage.RuleElementSyntax", { message: error.message }),
                    );
                    throw error; // prevent update, to give the user a chance to correct, and prevent bad data
                }
            }
        }
    }
}

interface RuleElementFormSheetData<TSource extends RuleElementSource, TObject extends RuleElementPF2e | null>
    extends Omit<RuleElementFormOptions<TSource, TObject>, "sheet"> {
    item: ItemPF2e;
    label: string;
    /** A prefix for use in label-input/select pairs */
    fieldIdPrefix: string;
    recognized: boolean;
    basePath: string;
    fields: RuleElementSchema | undefined;
    /** A collection of additional handlebars functions */
    form: Record<string, unknown>;
}

interface RuleElementFormTabData {
    /** Valid tab names for this form */
    names: string[];
    /** The display style applied to active tabs */
    displayStyle: "block" | "flex" | "grid";
}

export { RuleElementForm };
export type { RuleElementFormOptions, RuleElementFormSheetData, RuleElementFormTabData };
