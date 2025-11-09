import { CustomFormGroup, CustomFormInput, FormSelectOption } from "@client/applications/forms/fields.mjs";
import { DocumentUUID } from "@client/utils/_module.mjs";
import { DocumentType, FileCategory, FilePath } from "@common/constants.mjs";
import {
    DataField,
    DocumentFlagsField,
    DocumentStatsData,
    MaybeSchemaProp,
    ModelPropFromDataField,
    SourceFromDataField,
} from "./fields.mjs";
import { DataModelValidationFailure } from "./validation-failure.mjs";

/**
 * A Custom DataField validator function.
 *
 * A boolean return value indicates that the value is valid (true) or invalid (false) with certainty. With an explicit
 * boolean return value no further validation functions will be evaluated.
 *
 * An undefined return indicates that the value may be valid but further validation functions should be performed,
 * if defined.
 *
 * An Error may be thrown which provides a custom error message explaining the reason the value is invalid.
 */
type DataFieldValidator = (
    value: unknown,
    options: DataFieldValidationOptions,
) => boolean | DataModelValidationFailure | void;

export interface DataFieldOptions<
    TSourceProp,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> {
    /** Is this field required to be populated? */
    required?: TRequired;

    /** Can this field have null values? */
    nullable?: TNullable;

    /** Can this field only be modified by a gamemaster or assistant gamemaster? */
    gmOnly?: boolean;

    /** The initial value of a field, or a function which assigns that initial value. */
    initial?: THasInitial extends true
        ?
              | TSourceProp
              | ((data: Record<string, unknown>) => MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>)
              | null
        : THasInitial extends false
          ? undefined
          :
                | TSourceProp
                | ((data: Record<string, unknown>) => MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>)
                | null
                | undefined;

    /** A localizable label displayed on forms which render this field. */
    label?: string;

    /**
     * Localizable help text displayed on forms which render this field.
     */
    hint?: string;

    /** A custom data field validation function. */
    validate?: DataFieldValidator;

    readonly?: boolean;
    /**
     * A custom validation error string. When displayed will be prepended with the
     *    document name, field name, and candidate value. This error string is only
     *    used when the return type of the validate function is a boolean. If an Error
     *    is thrown in the validate function, the string message of that Error is used.
     */
    validationError?: string;
}

export interface DataFieldContext {
    /** A field name to assign to the constructed field */
    name?: string;
    /** Another data field which is a hierarchical parent of this one */
    parent?: DataField;
}

export interface DataFieldValidationOptions {
    /** Whether this is a partial schema validation, or a complete one. */
    partial?: boolean;
    /** Whether to allow replacing invalid values with valid fallbacks. */
    fallback?: boolean;
    /** The full source object being evaluated. */
    source?: Record<string, JSONValue>;
    /**
     * If true, invalid embedded documents will emit a warning and be placed in the invalidDocuments collection rather
     * than causing the parent to be considered invalid.
     */
    dropInvalidEmbedded?: boolean;
}

export interface FormGroupConfig {
    /** A text label to apply to the form group */
    label: string;

    /** An optional units string which is appended to the label */
    units?: string;

    /** An HTML element or collection of elements which provide the inputs for the group */
    input: HTMLElement | HTMLCollection;

    /**
     * Hint text displayed as part of the form group
     */
    hint?: string;
    /**
     * Some parent CSS id within which field names are unique. If provided,
     *                       this root ID is used to automatically assign "id" attributes to
     *                       input elements and "for" attributes to corresponding labels.
     */
    rootId?: string;
    /**
     * An array of CSS classes applied to the form group element
     */
    classes?: string[];
    /**
     * Is the "stacked" class applied to the form group
     */
    stacked?: boolean;
    /**
     * Should labels or other elements within this form group be
     *              automatically localized?
     */
    localize?: boolean;
    /**
     * The value of the form group's hidden attribute
     */
    hidden?: boolean | "until-found";
    /**
     * A custom form group widget function which replaces the default
     *              group HTML generation
     */
    widget?: CustomFormGroup;
}

interface FormInputConfig<TValue = unknown> {
    /**
     * The name of the form element
     */
    name: string;
    /**
     * The current value of the form element
     */
    value?: Maybe<TValue>;
    /**
     * An id to assign to the element
     */
    id?: string;
    /**
     * Is the field required?
     */
    required?: boolean;
    /**
     * Is the field disabled?
     */
    disabled?: boolean;
    /**
     * Is the field readonly?
     */
    readonly?: boolean;
    /**
     * Is the field autofocused?
     */
    autofocus?: boolean;
    /**
     * Localize values of this field?
     */
    localize?: boolean;
    /**
     * Additional dataset attributes to assign to the input
     */
    dataset?: Record<string, string>;
    /**
     * Aria attributes to assign to the input
     */
    aria?: Record<string, string>;
    /**
     * A placeholder value, if supported by the element type
     */
    placeholder?: string;
    /**
     * Space-delimited class names to apply to the input.
     */
    classes?: string;
    input?: CustomFormInput;
}

interface StringFieldInputConfig<TValue extends string = string> extends FormInputConfig<TValue> {
    /** The element to create for this form field
     */
    elementType?: "input" | "textarea" | "prose-mirror" | "code-mirror";
}

type CodeMirrorLanguage = "javascript" | "json" | "html" | "markdown" | "" | "plain";

interface CodeMirrorInputConfig {
    /** The value's language */
    language?: CodeMirrorLanguage;

    /** The number of spaces per level of indentation */
    indent?: number;
}

interface LightAnimationData {
    /** The animation type which is applied */
    type: string;

    /** The speed of the animation, a number between 0 and 10 */
    speed: number;

    /** The intensity of the animation, a number between 1 and 10 */
    intensity: number;

    /** Reverse the direction of animation.*/
    reverse: boolean;
}

interface NumberFieldOptions<
    TSourceProp extends number,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {
    /** A minimum allowed value */
    min?: number;
    /** A maximum allowed value */
    max?: number;
    /** A permitted step size */
    step?: number;
    /** Must the number be an integer? */
    integer?: boolean;
    /** Must the number be positive? */
    positive?: boolean;
    /**
     * An array of values or an object of values/labels which represent
     * allowed choices for the field. A function may be provided which dynamically
     * returns the array of choices.
     */

    choices?:
        | readonly TSourceProp[]
        | Record<string | number, string>
        | (() => readonly TSourceProp[] | Record<string | number, string>);
}

interface StringFieldOptions<
    TSourceProp extends string,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {
    /** Is the string allowed to be blank (empty)? */
    blank?: boolean;

    /** Should any provided string be trimmed as part of cleaning? */
    trim?: boolean;

    /**
     * An array of values or an object of values/labels which represent allowed choices for the field. A function may be
     * provided which dynamically returns the array of choices.
     */
    choices?:
        | readonly TSourceProp[]
        | Record<TSourceProp, string>
        | (() => readonly TSourceProp[] | Record<TSourceProp, string>);

    /** Is this string field a target for text search? */
    textSearch?: boolean;
}

interface ChoiceInputConfig {
    options: FormSelectOption[];
    choices: Record<string | number, any> | any[] | (() => Record<string | number, any> | any[]);
    labelAttr?: string;
    valueAttr?: string;
}

export interface ArrayFieldOptions<
    TSourceProp extends unknown[],
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {
    min?: number;
    max?: number;
}

export interface ObjectFieldOptions<
    TSourceProp extends object,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {}

interface DocumentUUIDFieldOptions<TRequired extends boolean, TNullable extends boolean, THasInitial extends boolean>
    extends StringFieldOptions<DocumentUUID, TRequired, TNullable, THasInitial> {
    /** A specific document type in {@link CONST.ALL_DOCUMENT_TYPES} required by this field */
    type?: DocumentType;
    /** Does this field require (or prohibit) embedded documents? */
    embedded?: boolean;
}

interface FilePathFieldOptions<
    TSourceProp extends FilePath,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends StringFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {
    /** A set of categories in CONST.FILE_CATEGORIES which this field supports */
    categories?: FileCategory[];
    /** Is embedded base64 data supported in lieu of a file path? */
    base64?: boolean;
    /** Does the file path field allow specifying a virtual file path which must begin with the "#" character? */
    virtual?: boolean;
    /** Does this file path field allow wildcard characters? */
    wildcard?: boolean;
}

export type DocumentFlagsSource = SourceFromDataField<DocumentFlagsField>;
export type DocumentFlags = ModelPropFromDataField<DocumentFlagsField>;

export interface DocumentStats extends DocumentStatsData {}

export interface JavaScriptFieldOptions<
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends StringFieldOptions<string, TRequired, TNullable, THasInitial> {
    /** Does the field allow async code? Default: false */
    async?: boolean;
}

export interface ElementValidationFailure {
    /** Either the element's index or some other identifier for it. */
    id: string | number;

    /** Optionally a user-friendly name for the element. */
    name?: string;

    /** The element's validation failure. */
    failure: DataModelValidationFailure;
}
