import { DataField } from "@common/data/fields.mjs";
import { NumberInputConfig, SelectInputConfig } from "./forms/fields.mjs";

/* -------------------------------------------- */
/*  HTML Template Loading                       */
/* -------------------------------------------- */

/**
 * Get a template from the server by fetch request and caching the retrieved result
 * @param path The web-accessible HTML template URL
 * @param id An ID to register the partial with.
 * @returns A Promise which resolves to the compiled Handlebars template
 */
export function getTemplate(path: string, id?: string): Promise<Handlebars.TemplateDelegate>;

/**
 * Load and cache a set of templates by providing an Array of paths
 * @param paths An array of template file paths to load, or an object of Handlebars partial IDs to paths.
 *
 * @example Loading a list of templates.
 * ```js
 * await foundry.applications.handlebars.loadTemplates(["templates/apps/foo.html", "templates/apps/bar.html"]);
 * ```
 * ```hbs
 * <!-- Include a preloaded template as a partial -->
 * {{> "templates/apps/foo.html" }}
 * ```
 *
 * @example Loading an object of templates.
 * ```js
 * await foundry.applications.handlebars.loadTemplates({
 *   foo: "templates/apps/foo.html",
 *   bar: "templates/apps/bar.html"
 * });
 * ```
 * ```hbs
 * <!-- Include a preloaded template as a partial -->
 * {{> foo }}
 * ```
 */
export function loadTemplates(paths: string[] | Record<string, string>): Promise<Handlebars.TemplateDelegate[]>;

/**
 * Get and render a template using provided data and handle the returned HTML
 * Support asynchronous file template file loading with a client-side caching layer
 *
 * Allow resolution of prototype methods and properties since this all occurs within the safety of the client.
 * @see {@link https://handlebarsjs.com/api-reference/runtime-options.html#options-to-control-prototype-access}
 *
 * @param path The file path to the target HTML template
 * @param data A data object against which to compile the template
 * @returns Returns the compiled and rendered template as a string
 */
export function renderTemplate(path: string, data?: object): Promise<string>;

/**
 * Initialize Handlebars extensions and helpers.
 */
export function initialize(): void;

/* -------------------------------------------- */
/*  Handlebars Template Helpers                 */
/* -------------------------------------------- */

/**
 * For checkboxes, if the value of the checkbox is true, add the "checked" property, otherwise add nothing.
 * @param value A value with a truthiness indicative of whether the checkbox is checked
 *
 * @example
 * ```hbs
 * <label>My Checkbox</label>
 * <input type="checkbox" name="myCheckbox" {{checked myCheckbox}}>
 * ```
 */
export function checked(value: unknown): string;

/**
 * For use in form inputs. If the supplied value is truthy, add the "disabled" property, otherwise add nothing.
 * @param value A value with a truthiness indicative of whether the input is disabled
 *
 * @example
 * ```hbs
 * <button type="submit" {{disabled myValue}}>Submit</button>
 * ```
 */
export function disabled(value: unknown): string;

/**
 * Concatenate a number of string terms into a single string.
 * This is useful for passing arguments with variable names.
 * @param values The values to concatenate
 *
 * @example Concatenate several string parts to create a dynamic variable
 * ```hbs
 * {{filePicker target=(concat "faces." i ".img") type="image"}}
 * ```
 */
export function concat(...values: string[]): Handlebars.SafeString;

/**
 * Construct an editor element for rich text editing with TinyMCE or ProseMirror.
 * @param content The content to display and edit.
 * @param options.target The named target data element
 * @param options.button Include a button used to activate the editor later?
 * @param options.class A specific CSS class to add to the editor container
 * @param options.editable Is the text editor area currently editable?
 * @param options.engine The editor engine to use, see {@link TextEditor.create}.
 * @param options.collaborate Whether to turn on collaborative editing features for ProseMirror.
 *
 * @example
 * ```hbs
 * {{editor world.description target="description" button=false engine="prosemirror" collaborate=false}}
 * ```
 */
export function editor(
    content: string,
    options?: {
        target?: string;
        button?: boolean;
        class?: string;
        editable?: boolean;
        engine?: string;
        collaborate?: boolean;
    },
): Handlebars.SafeString;

/**
 * A ternary expression that allows inserting A or B depending on the value of C.
 * @param criteria The test criteria
 * @param ifTrue The string to output if true
 * @param ifFalse The string to output if false
 * @returns The ternary result
 *
 * @example Ternary if-then template usage
 * ```hbs
 * {{ifThen true "It is true" "It is false"}}
 * ```
 */
export function ifThen(criteria: boolean, ifTrue: string, ifFalse: string): string;

/**
 * Translate a provided string key by using the loaded dictionary of localization strings.
 * @param value The path to a localized string
 * @param options Interpolation data passed to Localization#format
 *
 * @example Translate a provided localization string, optionally including formatting parameters
 * ```hbs
 * <label>{{localize "ACTOR.Create"}}</label> <!-- "Create Actor" -->
 * <label>{{localize "CHAT.InvalidCommand" command=foo}}</label> <!-- "foo is not a valid chat message command." -->
 * ```
 */
export function localize(value: string, options: { hash: object }): string;

/**
 * A string formatting helper to display a number with a certain fixed number of decimals and an explicit sign.
 * @param value A numeric value to format
 * @param options Additional options which customize the resulting format
 * @param options.decimals The number of decimal places to include in the resulting string
 * @param options.sign Whether to include an explicit "+" sign for positive numbers   *
 * @returns The formatted string to be included in a template
 *
 * @example
 * ```hbs
 * {{numberFormat 5.5}} <!-- 5.5 -->
 * {{numberFormat 5.5 decimals=2}} <!-- 5.50 -->
 * {{numberFormat 5.5 decimals=2 sign=true}} <!-- +5.50 -->
 * {{numberFormat null decimals=2 sign=false}} <!-- NaN -->
 * {{numberFormat undefined decimals=0 sign=true}} <!-- NaN -->
 *  ```
 */
export function numberFormat(
    value: number | string,
    options: { decimals?: number; sign?: boolean },
): Handlebars.SafeString;

/**
 * Render a form input field of type number with value appropriately rounded to step size.
 *
 * @example
 * ```hbs
 * {{numberInput value name="numberField" step=1 min=0 max=10}}
 * ```
 */
export function numberInput(value: number, options: NumberInputConfig): Handlebars.SafeString;

/**
 * Create an object from a sequence of `key=value` pairs.
 */
export function object(options: Handlebars.HelperOptions): Record<string, unknown>;

/**
 * A helper to create a set of radio checkbox input elements in a named set.
 * The provided keys are the possible radio values while the provided values are human-readable labels.
 *
 * @param name The radio checkbox field name
 * @param choices A mapping of radio checkbox values to human-readable labels
 * @param options Options which customize the radio boxes creation
 * @param options.checked Which key is currently checked?
 * @param options.localize Pass each label through string localization?
 *
 * @example The provided input data
 * ```js
 * let groupName = "importantChoice";
 * let choices = {a: "Choice A", b: "Choice B"};
 * let chosen = "a";
 * ```
 *
 * @example The template HTML structure
 * ```hbs
 * <div class="form-group">
 *   <label>Radio Group Label</label>
 *   <div class="form-fields">
 *     {{radioBoxes groupName choices checked=chosen localize=true}}
 *   </div>
 * </div>
 * ```
 */
export function radioBoxes(
    name: string,
    choices: object,
    options: { checked?: string; localize?: boolean },
): Handlebars.SafeString;

export interface SelectOptionsHelperOptions extends SelectInputConfig {
    /** Invert the key/value order of a provided choices object */
    invert: boolean;

    /** The currently selected value or values */
    selected: string | string[] | Set<string>;
}

/**
 * A helper to create a set of &lt;option> elements in a &lt;select> block based on a provided dictionary.
 * The provided keys are the option values while the provided values are human-readable labels.
 * This helper supports both single-select and multi-select input fields.
 *
 * @param choices A mapping of radio checkbox values to human-readable labels
 * @param {SelectOptionsHelperOptions} options Options which configure how select options are generated by the helper
 * @returns Generated HTML safe for rendering into a Handlebars template
 *
 * @example The provided input data
 * ```js
 * let choices = {a: "Choice A", b: "Choice B"};
 * let value = "a";
 * ```
 * The template HTML structure
 * ```hbs
 * <select name="importantChoice">
 *   {{selectOptions choices selected=value localize=true}}
 * </select>
 * ```
 * The resulting HTML
 * ```html
 * <select name="importantChoice">
 *   <option value="a" selected>Choice A</option>
 *   <option value="b">Choice B</option>
 * </select>
 * ```
 *
 * @example Using inverted choices
 * ```js
 * let choices = {"Choice A": "a", "Choice B": "b"};
 * let value = "a";
 * ```
 *  The template HTML structure
 *  ```hbs
 * <select name="importantChoice">
 *   {{selectOptions choices selected=value inverted=true}}
 * </select>
 * ```
 *
 * @example Using nameAttr and labelAttr with objects
 * ```js
 * let choices = {foo: {key: "a", label: "Choice A"}, bar: {key: "b", label: "Choice B"}};
 * let value = "b";
 * ```
 * The template HTML structure
 * ```hbs
 * <select name="importantChoice">
 *   {{selectOptions choices selected=value nameAttr="key" labelAttr="label"}}
 * </select>
 * ```
 *
 * @example Using nameAttr and labelAttr with arrays
 * ```js
 * let choices = [{key: "a", label: "Choice A"}, {key: "b", label: "Choice B"}];
 * let value = "b";
 * ```
 * The template HTML structure
 * ```hbs
 * <select name="importantChoice">
 *   {{selectOptions choices selected=value nameAttr="key" labelAttr="label"}}
 * </select>
 * ```
 */
export function selectOptions(
    choices: object | Array<object>,
    options: SelectOptionsHelperOptions,
): Handlebars.SafeString;

/**
 * Convert a DataField instance into an HTML input fragment.
 * @param field The DataField instance to convert to an input
 * @param options Helper options
 */
export function formInput(field: DataField, options: { hash: object }): Handlebars.SafeString;

/**
 * Convert a DataField instance into an HTML input fragment.
 * @param field The DataField instance to convert to an input
 * @param options Helper options
 */
export function formGroup(field: DataField, options: { hash: object }): Handlebars.SafeString;
