import type { AbstractFormInputElement } from "./form-element.d.ts";

/**
 * A custom HTMLElement used to select a color using a linked pair of input fields.
 */
export class HTMLColorPickerElement extends AbstractFormInputElement<string> {
    static override tagName: "color-picker";

    protected override _buildElements(): HTMLInputElement[];

    /** Create a HTMLColorPickerElement using provided configuration data. */
    static create(config: FormInputConfig<string>): HTMLColorPickerElement;
}
