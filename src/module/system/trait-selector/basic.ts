import { ActorSourcePF2e } from "@actor/data";
import { ActorPF2e } from "@actor/index";
import { ItemSourcePF2e } from "@item/data";
import { ItemPF2e } from "@item/index";
import { ValuesList } from "@module/data";
import { TagSelectorBase, TagSelectorOptions } from "./base";
import { SelectableTagField } from "./index";

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

export class TagSelectorBasic extends TagSelectorBase {
    allowCustom: boolean;
    searchString = "";
    private filterTimeout: number | null = null;

    constructor(object: ActorPF2e | ItemPF2e, options: BasicConstructorOptions) {
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

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/trait-selector/basic.html",
            height: 710,
        });
    }

    override getData() {
        const property = (() => {
            const property: unknown = getProperty(
                (this.object as { toObject(): ActorSourcePF2e | ItemSourcePF2e }).toObject(),
                this.objectProperty
            );

            if (isValuesList(property)) {
                const chosen: string[] = (property.value ?? []).map((prop) => prop.toString());
                const custom = this.allowCustom ? property.custom : null;
                return { chosen, custom };
            }

            if (Array.isArray(property)) {
                const chosen = property.map((prop) => String(prop));
                return { chosen, custom: null, flat: true };
            }

            return { chosen: [], custom: null };
        })();

        const { chosen, custom, flat } = property;
        const choices = Object.keys(this.choices).reduce((accumulated, type) => {
            accumulated[type] = {
                label: this.choices[type],
                selected: chosen.includes(type) || chosen.includes(type.toLowerCase()),
            };
            return accumulated;
        }, {} as Record<string, { label: string; selected: boolean }>);

        return {
            ...super.getData(),
            choices,
            allowCustom: this.allowCustom && !flat,
            custom,
            flat,
        };
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);

        // Search filtering
        $html.find<HTMLInputElement>('input[id="search"]').on("keyup", (event) => this.onFilterResults(event));
        if (this.searchString) {
            this.search(this.searchString);
        }
    }

    protected async _updateObject(event: Event, formData: Record<string, unknown>) {
        const { flat } = event.target ? $(event.target)?.data() : { flat: false };
        const value = this.getUpdateData(formData);
        if (this.allowCustom && typeof formData["custom"] === "string") {
            this.object.update({ [this.objectProperty]: { value, custom: formData["custom"] } });
        } else if (flat) {
            this.object.update({ [this.objectProperty]: value });
        } else {
            this.object.update({ [`${this.objectProperty}.value`]: value });
        }
    }

    private getUpdateData(formData: Record<string, unknown>) {
        const choices: string[] = [];
        Object.entries(formData).forEach(([language, selected]) => {
            if (selected) {
                choices.push(language);
            }
        });
        return choices;
    }

    /**
     * Filter the potential traits to only show ones which match a provided search string
     * @param searchString The search string to match
     */
    private search(searchString: string) {
        const query = new RegExp((RegExp as any).escape(searchString), "i");
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

export interface TagSelectorBasic {
    options: BasicSelectorOptions;
}
