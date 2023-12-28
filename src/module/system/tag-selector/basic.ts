import type { ActorPF2e } from "@actor";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ValuesList } from "@module/data.ts";
import { BaseTagSelector, TagSelectorData } from "./base.ts";
import { SelectableTagField, TagSelectorOptions } from "./index.ts";

/* Basic trait selector options */
export interface BasicSelectorOptions extends TagSelectorOptions {
    /* The base property to update e.g. 'data.traits.languages' */
    objectProperty: string;
    /* An array of keys from CONFIG.PF2E */
    configTypes: SelectableTagField[];
}

export type BasicConstructorOptions = Partial<BasicSelectorOptions> & { objectProperty: string };

function isValuesList(value: unknown): value is ValuesList {
    return !!(value && typeof value === "object" && "value" in value);
}

class TagSelectorBasic<TDocument extends ActorPF2e | ItemPF2e> extends BaseTagSelector<TDocument> {
    static override get defaultOptions(): TagSelectorOptions {
        return {
            ...super.defaultOptions,
            template: "systems/pf2e/templates/system/tag-selector/basic.hbs",
            filters: [{ inputSelector: "input[type=search]", contentSelector: "ul" }],
        };
    }

    allowCustom: boolean;

    protected objectProperty: string;

    constructor(document: TDocument, options: BasicConstructorOptions) {
        super(document, options);

        this.objectProperty = options.objectProperty;
        this.allowCustom = options.allowCustom ?? true;
        if (options.customChoices) {
            fu.mergeObject(this.choices, options.customChoices);
            this.choices = this.sortChoices(this.choices);
        }
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return this.options.configTypes ?? [];
    }

    override async getData(options?: Partial<TagSelectorOptions>): Promise<TagSelectorBasicData<TDocument>> {
        const { chosen, custom, flat, disabled } = (() => {
            const document: { toObject(): ActorSourcePF2e | ItemSourcePF2e } = this.document;
            // Compare source and prepared properties to determine which tags were automatically selected
            const sourceProperty: unknown = fu.getProperty(document.toObject(), this.objectProperty);
            const preparedProperty: unknown = fu.getProperty(document, this.objectProperty);

            if (Array.isArray(preparedProperty)) {
                const manuallyChosen = Array.isArray(sourceProperty) ? sourceProperty.map((prop) => String(prop)) : [];
                const automaticallyChosen = preparedProperty.filter((tag) => !manuallyChosen.includes(tag));
                const chosen = Array.from(new Set([...manuallyChosen, ...automaticallyChosen]));
                return { chosen, custom: null, flat: true, disabled: automaticallyChosen };
            } else if (isValuesList(preparedProperty) && isValuesList(sourceProperty)) {
                const manuallyChosen: string[] = sourceProperty.value.map((prop) => prop.toString());
                const custom = this.allowCustom ? sourceProperty.custom : null;
                const automaticallyChosen = preparedProperty.value.filter((tag) => !manuallyChosen.includes(tag));
                const chosen = Array.from(new Set([...manuallyChosen, ...automaticallyChosen]));
                return { chosen, custom, flat: false, disabled: automaticallyChosen };
            } else {
                return { chosen: [], custom: null, flat: this.flat, disabled: [] };
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
            allowCustom: this.allowCustom && !flat,
            custom,
            flat,
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onSearchFilter(_event: KeyboardEvent, _query: string, rgx: RegExp): void {
        for (const row of this.form.querySelectorAll("li")) {
            row.style.display = rgx.test(row.innerText) ? "" : "none";
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const flat = event.target instanceof HTMLElement ? event.target.dataset.flat : false;
        const value = this.#getUpdateData(formData);
        if (this.allowCustom && typeof formData["custom"] === "string") {
            return super._updateObject(event, { [this.objectProperty]: { value, custom: formData["custom"] } });
        } else if (flat) {
            return super._updateObject(event, { [this.objectProperty]: value });
        } else {
            return super._updateObject(event, { [`${this.objectProperty}.value`]: value });
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

interface TagSelectorBasicData<TDocument extends ActorPF2e | ItemPF2e> extends TagSelectorData<TDocument> {
    choices: Record<string, { label: string; selected: boolean; disabled: boolean }>;
    allowCustom: boolean;
    custom: string | null;
    flat: boolean;
}

export { TagSelectorBasic };
