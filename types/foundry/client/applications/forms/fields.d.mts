import { FormGroupConfig, FormInputConfig } from "@common/data/_types.mjs";
import { HTMLMultiSelectElement } from "../elements/multi-select.mjs";

/** Create a standardized form field group. */
export function createFormGroup(config: FormGroupConfig): HTMLDivElement;

/** Create an `<input type="checkbox">` element for a BooleanField. */
export function createCheckboxInput(config: FormInputConfig<boolean>): HTMLInputElement;

/** Create a `<div class="editor">` element for a StringField. */
export function createEditorInput(config: EditorInputConfig): HTMLDivElement;

/** Create a `<multi-select>` element for a StringField. */
export function createMultiSelectInput(config: MultiSelectInputConfig): HTMLMultiSelectElement;

/** Create an `<input type="number">` element foFormInputConfig<number> & NumberInputConfigr a NumberField. */
export function createNumberInput(config: NumberInputConfig): HTMLInputElement;

/** Create a `<select>` element for a StringField. */
export function createSelectInput(config: SelectInputConfig): HTMLSelectElement;

/** Create a `<textarea>` element for a StringField. */
export function createTextareaInput(config: TextAreaInputConfig): HTMLTextAreaElement;

/** Create an `<input type="text">` element for a StringField. */
export function createTextInput(config: FormInputConfig<string>): HTMLInputElement;

/* ---------------------------------------- */
/*  Helper Methods                          */
/* ---------------------------------------- */

/**
 * Structure a provided array of select options into a standardized format for rendering optgroup and option elements.
 *
 * @example
 * const options = [
 *   {value: "bar", label: "Bar", selected: true, group: "Good Options"},
 *   {value: "foo", label: "Foo", disabled: true, group: "Bad Options"},
 *   {value: "baz", label: "Baz", group: "Good Options"}
 * ];
 * const groups = ["Good Options", "Bad Options", "Unused Options"];
 * const optgroups = foundry.applications.fields.prepareSelectOptionGroups({options, groups, blank: true, sort: true});
 */
export function prepareSelectOptionGroups(
    config: FormInputConfig<string> & SelectInputConfig,
): { group: string; options: FormSelectOption[] }[];

/**
 * Apply standard attributes to all input elements.
 * @param input The element being configured
 * @param config Configuration for the element
 */
export function setInputAttributes<TValue extends string | boolean = string | boolean>(
    input: HTMLElement,
    config: FormInputConfig<TValue>,
): void;

/**
 * Create an HTML element for a FontAwesome icon
 * @param glyph A FontAwesome glyph name, such as "file" or "user"
 * @param options Additional options to configure the icon
 * @param options.style The style name for the icon
 * @param options.fixedWidth Should icon be fixed-width?
 * @param options.classes Additional classes to append to the class list
 * @returns The configured FontAwesome icon element
 * @see {@link https://fontawesome.com/search}
 */
export function createFontAwesomeIcon(
    glyph: string,
    options?: { style?: "solid" | "regular" | "duotone"; fixedWidth?: boolean; classes?: string[] },
): HTMLElement;

export type CustomFormGroup = (field: foundry.data.fields.DataField, groupConfig: FormGroupConfig) => HTMLDivElement;

export type CustomFormInput = (
    field: foundry.data.fields.DataField,
    config: FormInputConfig,
) => HTMLElement | HTMLCollection;

export interface EditorInputConfig extends FormInputConfig<string> {
    /** Default: `prosemirror` */
    engine?: string;
    height?: number;
    /** Default: `true` */
    editable?: boolean;
    /** Default: `false` */
    button?: boolean;
    /** Default: `false` */
    collaborate?: boolean;
}

export interface FormSelectOption {
    value: string;
    label: string;
    /** An optional `optgoup` for this option */
    group?: string;
    disabled?: boolean;
    selected?: boolean;
}

export interface SelectInputConfig extends FormInputConfig<string> {
    /** The name of the form element */
    name: string;
    /** The select options */
    options: FormSelectOption[];
    /**
     * An option to control the order and display of optgroup elements. The order of
     *  strings defines the displayed order of optgroup elements.
     *  A blank string may be used to define the position of ungrouped options.
     *  If not defined, the order of groups corresponds to the order of options.
     */
    groups?: string[];
    /** Adds a blank option with the `blank` value as the label */
    blank?: string;
    /** An alternative value key of the object passed to the options array */
    valueAttr?: string;
    /** An alternative label key of the object passed to the options array */
    labelAttr?: string;
    /** Localize value labels. Default: `false` */
    localize?: boolean;
    /** Sort options alphabetically by label within groups. Default: `false` */
    sort?: boolean;
}

export type MultiSelectInputConfig = Omit<SelectInputConfig, "blank"> & {
    /** Creates a multi-checkbox element instead */
    type?: "checkboxes";
    /** The currently selected values */
    value?: string[];
};

export interface NumberInputConfig extends FormInputConfig<number> {
    min: number;
    max: number;
    step: number | "any";
}

export interface TextAreaInputConfig extends FormInputConfig<string> {
    rows: number;
}
