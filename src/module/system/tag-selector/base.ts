import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { SelectableTagField } from ".";

export interface TagSelectorOptions extends FormApplicationOptions {
    /* Show the custom input field (defaults to true) */
    allowCustom?: boolean;
    /** Is the target data property a flat array rather than a values object? */
    flat?: boolean;
    /* Custom choices to add to the list of choices */
    customChoices?: Record<string, string>;
}

export abstract class TagSelectorBase<
    TDocument extends ActorPF2e | ItemPF2e = ActorPF2e | ItemPF2e
> extends FormApplication<TDocument> {
    choices: Record<string, string>;
    flat: boolean;
    objectProperty = "";

    constructor(object: TDocument, options: Partial<TagSelectorOptions> = {}) {
        super(object, options);
        this.flat = options.flat ?? false;
        this.choices = this.getChoices();
    }

    protected abstract get configTypes(): readonly SelectableTagField[];

    static override get defaultOptions(): TagSelectorOptions {
        return mergeObject(super.defaultOptions, {
            id: "trait-selector",
            classes: ["pf2e"],
            width: "auto",
            height: 700,
        });
    }

    protected abstract override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        $html.find<HTMLInputElement>('input[type="text"], input[type="number"]').on("focusin", (event) => {
            event.currentTarget.select();
        });
    }

    /**
     * Builds an object of all keys of this.configTypes from CONFIG.PF2E
     * @returns An object of all key and translated value pairs sorted by key
     */
    private getChoices(): Record<string, string> {
        const choices = this.configTypes.reduce(
            (types, key) => mergeObject(types, CONFIG.PF2E[key]),
            {} as Record<string, string>
        );
        return this.sortChoices(choices);
    }

    /** Localize and sort choices */
    protected sortChoices(choices: Record<string, string>): Record<string, string> {
        return Object.entries(choices)
            .map(([key, value]) => [key, game.i18n.localize(value)])
            .sort(([_keyA, valueA], [_keyB, valueB]) => valueA.localeCompare(valueB))
            .reduce(
                (accumulated: Record<string, string>, [key, value]) => mergeObject(accumulated, { [key]: value }),
                {}
            );
    }
}

export interface TagSelectorBase {
    options: FormApplicationOptions;
}
