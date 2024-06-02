import type { AbstractFormInputElement } from "./form-element.d.ts";

/**
 * A custom HTML element responsible for rendering a file input field and associated FilePicker button.
 * @extends {AbstractFormInputElement<string>}
 */
export default class HTMLFilePickerElement extends AbstractFormInputElement<string> {
    static override tagName: "file-picker";

    /** The file path selected. */
    input: HTMLInputElement;

    /** A button to open the file picker interface. */
    button: HTMLButtonElement;

    /** A reference to the FilePicker application instance originated by this element. */
    picker: FilePicker;

    /**
     * A type of file which can be selected in this field.
     * @see {@link FilePicker.FILE_TYPES}
     */
    get type(): (typeof FilePicker.FILE_TYPES)[number];
    set type(value: (typeof FilePicker.FILE_TYPES)[number]);

    /** Prevent uploading new files as part of this element's FilePicker dialog. */
    get noupload(): boolean;
    set noupload(value: boolean);

    /** Create a HTMLFilePickerElement using provided configuration data. */
    static create(config: FilePickerInputConfig): HTMLFilePickerElement;
}

declare global {
    interface FilePickerInputConfig extends FormInputConfig<string> {
        type?: FilePickerOptions["type"];
        placeholder?: string;
        noupload?: boolean;
    }
}
