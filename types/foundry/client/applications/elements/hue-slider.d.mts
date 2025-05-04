import { HexColorString } from "@common/constants.mjs";
import { FormInputConfig } from "@common/data/_types.mjs";
import AbstractFormInputElement from "./form-element.mjs";

/**
 * A class designed to standardize the behavior for a hue selector UI component.
 */
export default class HTMLHueSelectorSlider extends AbstractFormInputElement<number> {
    static override tagName: "hue-slider";

    protected override _buildElements(): [HTMLInputElement];

    /**
     * Refresh the active state of the custom element.
     */
    protected _refresh(): void;

    /**
     * Activate event listeners which add dynamic behavior to the custom element.
     */
    protected _activateListeners(): void;

    /* -------------------------------------------- */
    /*  Form Handling                               */
    /* -------------------------------------------- */

    protected override _setValue(value: string | number): void;

    protected override _toggleDisabled(disabled: boolean): void;

    /**
     * Create a HTMLHueSelectorSlider using provided configuration data.
     */
    static create(config: FormInputConfig<HexColorString>): HTMLHueSelectorSlider;
}
