import type { AbstractFormInputElement } from "./form-element.d.ts";

/**
 * A custom HTML element which allows for arbitrary assignment of a set of string tags.
 * This element may be used directly or subclassed to impose additional validation or functionality.
 */
export default class HTMLStringTagsElement extends AbstractFormInputElement<Set<string>, string[]> {
    static override tagName: "string-tags";

    static icons: {
        add: string;
        remove: string;
    };

    static labels: {
        add: string;
        remove: string;
        placeholder: string;
    };

    /**
     * Initialize innerText or an initial value attribute of the element as a comma-separated list of currently assigned
     * string tags.
     */
    protected _initializeTags(): void;

    /**
     * Subclasses may impose more strict validation on what tags are allowed.
     * @param  tag      A candidate tag
     * @throws          An error if the candidate tag is not allowed
     */
    protected _validateTag(tag: string): void;

    /**
     * Render the HTML fragment used to represent a tag.
     * @param tag       The raw tag value
     * @param label     An optional tag element
     * @param [editable=true] Is the tag editable?
     * @returns         An HTML string for the tag
     */
    static renderTag(tag: string, label?: string, editable?: boolean): string;

    /* -------------------------------------------- */
    /*  Form Handling                               */
    /* -------------------------------------------- */

    /** Create a HTMLStringTagsElement using provided configuration data. */
    static create(config: FormInputConfig<string>): HTMLStringTagsElement;
}
