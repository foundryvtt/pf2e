import type { AbstractFormInputElement } from "./form-element.d.ts";

/**
 * A class designed to standardize the behavior for a hue selector UI component.
 */
export default class HTMLHueSelectorSlider extends AbstractFormInputElement<number> {
    static override tagName: "hue-slider";

    override _buildElements(): HTMLInputElement[];
}
