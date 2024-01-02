import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import { htmlQueryAll, sortStringRecord } from "@util";
import type { SelectableTagField } from "./index.ts";

abstract class BaseTagSelector<TDocument extends ActorPF2e | ItemPF2e> extends DocumentSheet<
    TDocument,
    TagSelectorOptions
> {
    static override get defaultOptions(): TagSelectorOptions {
        return {
            ...super.defaultOptions,
            id: "tag-selector",
            classes: ["pf2e", "tag-selector"],
            sheetConfig: false,
            width: "auto",
        };
    }

    choices: Record<string, string>;

    /** The object path to the property containing the tags */
    protected abstract objectProperty: string;

    /** Whether the tags are in an object containing a `value` array property or just an array by its lonesome */
    flat: boolean;

    constructor(document: TDocument, options: Partial<TagSelectorOptions> = {}) {
        super(document, options);
        this.flat = options.flat ?? false;
        this.choices = this.#getChoices();
    }

    override get id(): string {
        return `${this.options.id}-${this.document.uuid}`;
    }

    override get title(): string {
        return game.i18n.localize(this.options.title || "PF2E.TraitsLabel");
    }

    protected abstract get configTypes(): readonly SelectableTagField[];

    override async getData(options?: Partial<TagSelectorOptions> | undefined): Promise<TagSelectorData<TDocument>> {
        return {
            ...(await super.getData(options)),
            documentType: (this.document.constructor as typeof foundry.abstract.Document).metadata.label,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];
        for (const input of htmlQueryAll<HTMLInputElement>(html, "input:not([type=checkbox])")) {
            input.addEventListener("focusin", () => {
                input.select();
            });
        }
    }

    /**
     * Builds an object of all keys of this.configTypes from CONFIG.PF2E
     * @returns An object of all key and translated value pairs sorted by key
     */
    #getChoices(): Record<string, string> {
        const choices = this.configTypes.reduce(
            (types: Record<string, string>, key) => fu.mergeObject(types, CONFIG.PF2E[key]),
            {},
        );
        return sortStringRecord(choices);
    }
}

interface TagSelectorOptions extends DocumentSheetOptions {
    /* The value object to update; e.g., "system.traits" */
    objectProperty?: string;
    /** Is the target data property a flat array rather than a `value` object? */
    flat?: boolean;
    /* Custom choices to add to the choices pulled from `CONFIG` */
    customChoices?: Record<string, string>;
}

interface TagSelectorData<TDocument extends ActorPF2e | ItemPF2e> extends DocumentSheetData<TDocument> {
    documentType: string;
}

export { BaseTagSelector };
export type { TagSelectorData, TagSelectorOptions };
