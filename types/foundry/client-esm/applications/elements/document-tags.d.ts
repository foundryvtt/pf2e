import type { AbstractFormInputElement } from "./form-element.d.ts";

/**
 * A custom HTMLElement used to render a set of associated Documents referenced by UUID.
 */
export default class HTMLDocumentTagsElement extends AbstractFormInputElement<
    Record<string, string>,
    string | string[] | null
> {
    static override tagName: "document-tags";

    /** Restrict this element to documents of a particular type. */
    get type(): string | null;
    set type(value: string | null);

    /** Restrict to only allow referencing a single Document instead of an array of documents. */
    get single(): boolean;
    set single(value: boolean);

    /** Allow a maximum number of documents to be tagged to the element. */
    get max(): number;
    set max(value: number | null);

    /** Initialize innerText or an initial value attribute of the element as a serialized JSON array. */
    protected _initializeTags(): void;

    /**
     * Create an HTML string fragment for a single document tag.
     * @param uuid     The document UUID
     * @param name     The document name
     * @param [editable=true] Is the tag editable?
     */
    static renderTag(uuid: DocumentUUID, name: string, editable?: boolean): string;

    /** Create a HTMLDocumentTagsElement using provided configuration data. */
    static create(config: DocumentTagsInputConfig): HTMLDocumentTagsElement;
}

declare global {
    interface DocumentTagsInputConfig extends FormInputConfig {
        /** A specific document type in CONST.ALL_DOCUMENT_TYPES */
        type?: string;
        /**
         * Only allow referencing a single document. In this case the submitted form value will be a single UUID string
         * rather than an array
         */
        single?: boolean;
        /** Only allow attaching a maximum number of documents */
        max?: number;
    }
}
