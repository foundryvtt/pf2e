import { ActorPF2e } from "@actor";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { ValuesList } from "@module/data.ts";
import { htmlQuery, htmlQueryAll } from "@util";
import { BaseTagSelector } from "./base.ts";
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
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/tag-selector/basic.hbs",
            height: 700,
        });
    }

    allowCustom: boolean;

    #filterTimeout: number | null = null;

    protected objectProperty: string;

    constructor(object: TDocument, options: BasicConstructorOptions) {
        options.title ||= "PF2E.TraitsLabel";
        super(object, options);

        this.objectProperty = options.objectProperty;
        this.allowCustom = options.allowCustom ?? true;
        if (options.customChoices) {
            mergeObject(this.choices, options.customChoices);
            this.choices = this.sortChoices(this.choices);
        }
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return this.options.configTypes ?? [];
    }

    override async getData(): Promise<TagSelectorBasicData<TDocument>> {
        const { chosen, custom, flat, disabled } = (() => {
            const document: { toObject(): ActorSourcePF2e | ItemSourcePF2e } = this.object;
            // Compare source and prepared properties to determine which tags were automatically selected
            const sourceProperty: unknown = getProperty(document.toObject(), this.objectProperty);
            const preparedProperty: unknown = getProperty(document, this.objectProperty);

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

        const choices = Object.keys(this.choices).reduce((accumulated, type) => {
            accumulated[type] = {
                label: this.choices[type],
                selected: chosen.includes(type),
                disabled: disabled.includes(type),
            };
            return accumulated;
        }, {} as Record<string, { label: string; selected: boolean; disabled: boolean }>);

        return {
            ...(await super.getData()),
            choices,
            allowCustom: this.allowCustom && !flat,
            custom,
            flat,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Search filtering
        const searchInput = htmlQuery<HTMLInputElement>(html, "input[type=search]");
        searchInput?.addEventListener("input", () => {
            this.#onFilterResults(searchInput);
        });
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const { flat } = event.target ? $(event.target).data() : { flat: false };
        const value = this.#getUpdateData(formData);
        if (this.allowCustom && typeof formData["custom"] === "string") {
            await this.object.update({ [this.objectProperty]: { value, custom: formData["custom"] } });
        } else if (flat) {
            await this.object.update({ [this.objectProperty]: value });
        } else {
            await this.object.update({ [`${this.objectProperty}.value`]: value });
        }
    }

    #getUpdateData(formData: Record<string, unknown>): string[] | number[] {
        const optionsAreNumeric = Object.keys(formData).every((tag) => Number.isInteger(Number(tag)));
        const selections = Object.entries(formData)
            .flatMap(([tag, selected]) => (selected ? tag : []))
            .filter((tag) => tag !== "custom");
        return optionsAreNumeric ? selections.map((tag) => Number(tag)) : selections;
    }

    /**
     * Filter the potential traits to only show ones which match a provided search string
     * @param searchString The search string to match
     */
    #search(searchString: string): void {
        const query = new RegExp(RegExp.escape(searchString), "i");
        const html = this.element[0];
        for (const row of htmlQueryAll(html, "li.trait-item")) {
            const name = row.getElementsByClassName("trait-label")[0]?.textContent ?? "";
            row.style.display = query.test(name) ? "flex" : "none";
        }
    }

    /**
     * Handle trait filtering through search field
     * Toggle the visibility of indexed trait entries by name match
     */
    #onFilterResults(input: HTMLInputElement): void {
        if (this.#filterTimeout) {
            clearTimeout(this.#filterTimeout);
            this.#filterTimeout = null;
        }
        this.#filterTimeout = window.setTimeout(() => this.#search(input.value), 100);
    }
}

interface TagSelectorBasic<TDocument extends ActorPF2e | ItemPF2e> extends BaseTagSelector<TDocument> {
    options: BasicSelectorOptions;
}

interface TagSelectorBasicData<TDocument extends ActorPF2e | ItemPF2e> extends FormApplicationData<TDocument> {
    choices: Record<string, { label: string; selected: boolean; disabled: boolean }>;
    allowCustom: boolean;
    custom: string | null;
    flat: boolean;
}

export { TagSelectorBasic };
