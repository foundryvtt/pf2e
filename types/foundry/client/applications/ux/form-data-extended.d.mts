import { TinyMCEEditorData } from "../../appv1/api/form-application-v1.mjs";
import ProseMirrorEditor from "./prosemirror-editor.mjs";

/**
 * An extension of the native FormData implementation.
 *
 * This class functions the same way that the default FormData does, but it is more opinionated about how
 * input fields of certain types should be evaluated and handled.
 *
 * It also adds support for certain Foundry VTT specific concepts including:
 *  Support for defined data types and type conversion
 *  Support for TinyMCE editors
 *  Support for editable HTML elements
 */
export default class FormDataExtended extends FormData {
    /**
     *
     * @param form    The form being processed
     * @param options Options which configure form processing
     */
    constructor(form: HTMLFormElement, options?: Partial<FormDataExtendedOptions>);

    /**
     * A mapping of data types requested for each form field.
     */
    dtypes: Record<string, string>;

    /**
     * A record of TinyMCE editors which are linked to this form.
     */
    editors: Record<string, TinyMCE.Editor | ProseMirrorEditor>;

    /**
     * The object representation of the form data, available once processed.
     */
    readonly object: Record<string, unknown>;

    /**
     * Process the HTML form element to populate the FormData instance.
     * @param form    The HTML form being processed
     * @param options Options forwarded from the constructor
     */
    process(form: HTMLFormElement, options: FormDataExtendedOptions): void;

    /**
     * Assign a value to the FormData instance which always contains JSON strings.
     * Also assign the cast value in its preferred data type to the parsed object representation of the form data.
     * @param {string} name     The field name
     * @param {string} value       The raw extracted value from the field
     */
    override set(name: string, value: string | Blob): void;

    /**
     * Append values to the form data, adding them to an array.
     * @param name  The field name to append to the form
     * @param value The value to append to the form data
     */
    override append(name: string, value: unknown): void;
}

interface FormDataExtendedOptions {
    /** A record of TinyMCE editor metadata objects, indexed by their update key */
    editors: Record<string, TinyMCEEditorData>;
    /** A mapping of data types for form fields */
    dtypes: string[];
    /**
     * Include disabled fields?
     * @default false
     */
    disabled: boolean;
    /**
     * Include readonly fields?
     * @default false
     */
    readonly: boolean;
}
