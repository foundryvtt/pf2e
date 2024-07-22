import type { HTMLMultiSelectElement } from "../elements/multi-select.d.ts";

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
 * @param input    The element being configured
 * @param config   Configuration for the element
 */
export function setInputAttributes<TValue extends string | boolean = string | boolean>(
    input: HTMLElement,
    config: FormInputConfig<TValue>,
): void;

declare global {
    type CustomFormGroup = (field: foundry.data.fields.DataField, groupConfig: FormGroupConfig) => HTMLDivElement;

    type CustomFormInput = (
        field: foundry.data.fields.DataField,
        config: FormInputConfig,
    ) => HTMLElement | HTMLCollection;

    interface FormGroupConfig {
        /** A text label to apply to the form group */
        label: string;
        /** An optional units string which is appended to the label */
        units?: string;
        /** An HTML element or collection of elements which provide the inputs for the group  */
        input: HTMLElement | HTMLCollection;
        /** Hint text displayed as part of the form group */
        hint?: string;
        /**
         *  Some parent CSS id within which field names are unique. If provided, this root ID
         *  is used to automatically assign "id" attributes to input elements and "for" attributes
         *  to corresponding labels
         */
        rootId?: string;
        /** An array of CSS classes applied to the form group element */
        classes?: string[];
        /** Is the "stacked" class applied to the form group. Default: `false` */
        stacked?: boolean;
        /**
         *  Should labels or other elements within this form group be automatically localized?
         *  Default: `false`
         */
        localize?: boolean;
        /** A custom form group widget function which replaces the default group HTML generation */
        widget?: CustomFormGroup;
    }

    interface FormInputConfig<TValue extends string | boolean = string | boolean> {
        /** The name of the form element */
        name: string;
        /** The current value of the form element */
        value: TValue;
        /** Is the field required? Default: `false` */
        required?: boolean;
        /** Is the field disabled? Default: `false` */
        disabled?: boolean;
        /** Is the field readonly? Default: `false` */
        readonly?: boolean;
        /** Localize values of this field? Default: `false`*/
        localize?: boolean;
        /** Additional dataset attributes to assign to the input */
        dataset?: Record<string, string>;
        /** A placeholder value, if supported by the element type */
        placeholder?: string;
    }

    interface EditorInputConfig extends FormInputConfig<string> {
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

    interface FormSelectOption {
        value: string;
        label: string;
        /** An optional `optrgoup` for this option */
        group?: string;
        disabled?: boolean;
        selected?: boolean;
    }

    interface SelectInputConfig {
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

    type MultiSelectInputConfig = Omit<SelectInputConfig, "blank"> & {
        /** Creates a multi-checkbox element instead */
        type?: "checkboxes";
        /** The currently selected values */
        value?: string[];
    };

    interface NumberInputConfig {
        min: number;
        max: number;
        step: number | "any";
    }

    interface TextAreaInputConfig extends FormInputConfig<string> {
        rows: number;
    }
}
