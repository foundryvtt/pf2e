import type { AbstractFormInputElement } from "./form-element.d.ts";

/**
 * An abstract base class designed to standardize the behavior for a multi-select UI component.
 * Multi-select components return an array of values as part of form submission.
 * Different implementations may provide different experiences around how inputs are presented to the user.
 */
export abstract class AbstractMultiSelectElement extends AbstractFormInputElement<string[], string[]> {
    /** Predefined <option> and <optgroup> elements which were defined in the original HTML. */
    protected _options: (HTMLOptionElement | HTMLOptGroupElement)[];

    /** An object which maps option values to displayed labels. */
    protected _choices: Record<string, string>;

    /** Preserve existing <option> and <optgroup> elements which are defined in the original HTML. */
    protected _initialize(): void;

    /**
     * Mark a choice as selected.
     * @param value      The value to add to the chosen set
     */
    select(value: string): void;

    /**
     * Mark a choice as un-selected.
     * @param value      The value to delete from the chosen set
     */
    unselect(value: string): void;

    /* -------------------------------------------- */
    /*  Form Handling                               */
    /* -------------------------------------------- */

    override _getValue(): string[];

    override _setValue(value: string[]): void;
}

/**
 * Provide a multi-select workflow using a select element as the input mechanism.
 *
 * @example Multi-Select HTML Markup
 * ```html
 * <multi-select name="select-many-things">
 *   <optgroup label="Basic Options">
 *     <option value="foo">Foo</option>
 *     <option value="bar">Bar</option>
 *     <option value="baz">Baz</option>
 *   </optgroup>
 *   <optgroup label="Advanced Options">
 *    <option value="fizz">Fizz</option>
 *     <option value="buzz">Buzz</option>
 *   </optgroup>
 * </multi-select>
 * ```
 */
export class HTMLMultiSelectElement extends AbstractMultiSelectElement {
    static override tagName: "multi-select";

    /**
     * Create a HTMLMultiSelectElement using provided configuration data.
     * @param {FormInputConfig<string[]> & Omit<SelectInputConfig, "blank">} config
     * @returns {HTMLMultiSelectElement}
     */
    static create(config: MultiSelectInputConfig): HTMLMultiSelectElement;
}

/**
 * Provide a multi-select workflow as a grid of input checkbox elements.
 *
 * @example Multi-Checkbox HTML Markup
 * ```html
 * <multi-checkbox name="check-many-boxes">
 *   <optgroup label="Basic Options">
 *     <option value="foo">Foo</option>
 *     <option value="bar">Bar</option>
 *     <option value="baz">Baz</option>
 *   </optgroup>
 *   <optgroup label="Advanced Options">
 *    <option value="fizz">Fizz</option>
 *     <option value="buzz">Buzz</option>
 *   </optgroup>
 * </multi-checkbox>
 * ```
 */
export class HTMLMultiCheckboxElement extends AbstractMultiSelectElement {
    static override tagName: "multi-checkbox";
}
