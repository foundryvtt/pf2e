import type { ActorPF2e } from "@actor";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ValuesList } from "@module/data.ts";
import { htmlQuery, sortStringRecord } from "@util";
import * as R from "remeda";
import { BaseTagSelector, TagSelectorData } from "./base.ts";
import { SelectableTagField, TagSelectorOptions } from "./index.ts";

export type BasicConstructorOptions = Partial<BasicSelectorOptions> & { objectProperty: string };

function isValuesList(obj: unknown): obj is ValuesList {
    return (
        R.isObjectType(obj) &&
        "value" in obj &&
        Array.isArray(obj.value) &&
        obj.value.every((v) => typeof v === "string")
    );
}

class TagSelectorBasic<TDocument extends ActorPF2e | ItemPF2e> extends BaseTagSelector<TDocument> {
    static override get defaultOptions(): TagSelectorOptions {
        return {
            ...super.defaultOptions,
            template: `${SYSTEM_ROOT}/templates/system/tag-selector/basic.hbs`,
            filters: [{ inputSelector: "input[type=search]", contentSelector: "ul", delay: 150 }],
            scrollY: ["ul"],
        };
    }

    protected objectProperty: string;

    constructor(document: TDocument, options: BasicConstructorOptions) {
        super(document, options);

        this.objectProperty = options.objectProperty;
        if (options.customChoices) {
            fu.mergeObject(this.choices, options.customChoices);
            this.choices = sortStringRecord(this.choices);
        }
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return this.options.configTypes ?? [];
    }

    override async getData(options?: Partial<TagSelectorOptions>): Promise<TagSelectorBasicData<TDocument>> {
        const { chosen, flat, disabled } = (() => {
            const document: { toObject(): ActorSourcePF2e | ItemSourcePF2e } = this.document;
            // Compare source and prepared properties to determine which tags were automatically selected
            const sourceProperty: unknown = fu.getProperty(document.toObject(), this.objectProperty);
            const preparedProperty: unknown = fu.getProperty(document, this.objectProperty);

            if (Array.isArray(preparedProperty)) {
                const manuallyChosen = Array.isArray(sourceProperty) ? sourceProperty.map((v) => String(v)) : [];
                const automaticallyChosen = preparedProperty.filter((v): v is string => !manuallyChosen.includes(v));
                const chosen = Array.from(new Set([...manuallyChosen, ...automaticallyChosen]));
                return { chosen, flat: true, disabled: automaticallyChosen };
            } else if (isValuesList(preparedProperty) && isValuesList(sourceProperty)) {
                const manuallyChosen: string[] = sourceProperty.value.map((v) => v.toString());
                const automaticallyChosen = preparedProperty.value.filter(
                    (v): v is string => !manuallyChosen.includes(v),
                );
                const chosen = Array.from(new Set([...manuallyChosen, ...automaticallyChosen]));
                return { chosen, flat: false, disabled: automaticallyChosen };
            } else {
                return { chosen: [], flat: this.flat, disabled: [] };
            }
        })();

        const choices = Object.keys(this.choices).reduce(
            (accumulated, type) => {
                accumulated[type] = {
                    label: this.choices[type],
                    selected: chosen.includes(type),
                    disabled: disabled.includes(type),
                };
                return accumulated;
            },
            {} as Record<string, { label: string; selected: boolean; disabled: boolean }>,
        );

        return {
            ...(await super.getData(options)),
            choices,
            details: null,
            flat,
            hasCustomChoices: !!options?.customChoices,
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onSearchFilter(_event: KeyboardEvent, _query: string, rgx: RegExp): void {
        for (const row of this.form.querySelectorAll("li")) {
            row.style.display = rgx.test(row.querySelector("label")?.innerText ?? "") ? "" : "none";
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const flat = event.target instanceof HTMLElement ? event.target.dataset.flat : false;
        const value = this.#getUpdateData(formData);
        if (flat) {
            return super._updateObject(event, { [this.objectProperty]: value });
        } else {
            const data = ((): Record<string, string | string[] | number[]> => {
                const detailsEl = htmlQuery<HTMLInputElement>(event.target, "input[data-details]");
                return detailsEl?.dataset.path
                    ? {
                          [`${this.objectProperty}.value`]: value,
                          [detailsEl.dataset.path]: detailsEl.value.trim(),
                      }
                    : { [`${this.objectProperty}.value`]: value };
            })();
            return super._updateObject(event, data);
        }
    }

    #getUpdateData(formData: Record<string, unknown>): string[] | number[] {
        const optionsAreNumeric = Object.keys(formData).every((tag) => Number.isInteger(Number(tag)));
        const selections = Object.entries(formData)
            .flatMap(([tag, selected]) => (selected ? tag : []))
            .filter((s) => s !== "custom");
        return optionsAreNumeric ? selections.map((s) => Number(s)) : selections;
    }
}

interface TagSelectorBasic<TDocument extends ActorPF2e | ItemPF2e> extends BaseTagSelector<TDocument> {
    options: BasicSelectorOptions;
}

/* Basic tag selector options */
interface BasicSelectorOptions extends TagSelectorOptions {
    /* The actor value object to update; e.g., "system.traits" */
    objectProperty: string;
    /* An array of keys from CONFIG.PF2E */
    configTypes: SelectableTagField[];
}

interface TagSelectorBasicData<TDocument extends ActorPF2e | ItemPF2e> extends TagSelectorData<TDocument> {
    choices: Record<string, { label: string; selected: boolean; disabled: boolean }>;
    hasCustomChoices: boolean;
    details: { path: string; placeholder: string; value: string } | null;
    flat: boolean;
}

export { TagSelectorBasic };
export type { BasicSelectorOptions, TagSelectorBasicData };
