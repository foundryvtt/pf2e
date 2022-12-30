import { ActorSourcePF2e } from "@actor/data";
import { ActorPF2e } from "@actor/index";
import { ItemSourcePF2e } from "@item/data";
import { ItemPF2e } from "@item/index";
import { ValuesList } from "@module/data";
import { BaseTagSelector } from "./base";
import { SelectableTagField, TagSelectorOptions } from ".";

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
    allowCustom: boolean;
    /** Search string for filtering */
    searchString = "";

    private filterTimeout: number | null = null;

    protected objectProperty: string;

    constructor(object: TDocument, options: BasicConstructorOptions) {
        super(object, options);
        this.objectProperty = options.objectProperty;
        this.allowCustom = options.allowCustom ?? true;
        if (options.customChoices) {
            mergeObject(this.choices, options.customChoices);
            this.choices = this.sortChoices(this.choices);
        }
        this.options.title = options.title ?? "PF2E.TraitsLabel";
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return this.options.configTypes ?? [];
    }

    static override get defaultOptions(): TagSelectorOptions {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/tag-selector/basic.hbs",
            height: 710,
        });
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

        // Search filtering
        $html.find<HTMLInputElement>('input[id="search"]').on("keyup", (event) => this.onFilterResults(event));
        if (this.searchString) {
            this.search(this.searchString);
        }
    }

    protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const { flat } = event.target ? $(event.target).data() : { flat: false };
        const value = this.getUpdateData(formData);
        if (this.allowCustom && typeof formData["custom"] === "string") {
            await this.object.update({ [this.objectProperty]: { value, custom: formData["custom"] } });
        } else if (flat) {
            await this.object.update({ [this.objectProperty]: value });
        } else {
            await this.object.update({ [`${this.objectProperty}.value`]: value });
        }
    }

    private getUpdateData(formData: Record<string, unknown>): string[] | number[] {
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
    private search(searchString: string) {
        const query = new RegExp(RegExp.escape(searchString), "i");
        (this.element as JQuery).find("li.trait-item").each((_i, li) => {
            const name = li.getElementsByClassName("trait-label")[0].textContent ?? "";
            li.style.display = query.test(name) ? "flex" : "none";
        });
        this.searchString = searchString;
    }

    /**
     * Handle trait filtering through search field
     * Toggle the visibility of indexed trait entries by name match
     */
    private onFilterResults(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const input: HTMLFormElement = event.currentTarget;
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
            this.filterTimeout = null;
        }
        this.filterTimeout = window.setTimeout(() => this.search(input.value), 100);
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
