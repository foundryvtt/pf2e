import { FormInputConfig } from "@common/data/_module.mjs";
import AbstractFormInputElement from "./form-element.mjs";

/**
 * A custom HTML element responsible selecting a value on a range slider with a linked number input field.
 */
export default class HTMLRangePickerElement extends AbstractFormInputElement<number> {
    static override tagName: "range-picker";

    /** The value of the input element. */
    get valueAsNumber(): number;

    protected override _buildElements(): HTMLInputElement[];

    /** Create a HTMLRangePickerElement using provided configuration data. */
    static create(config: RangePickerInputConfig): HTMLRangePickerElement;
}

export interface RangePickerInputConfig extends FormInputConfig<string> {
    min: number;
    max: number;
    step?: number;
}
