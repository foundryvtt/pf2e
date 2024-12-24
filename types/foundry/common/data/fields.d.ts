import type * as abstract from "../abstract/module.d.ts";
import type { ALL_DOCUMENT_TYPES } from "../constants.d.ts";
import type { EffectChangeData } from "../documents/active-effect.d.ts";
import type Color from "../utils/color.d.ts";
import type { TombstoneDataSchema } from "./data.d.ts";
import type { DataModelValidationFailure } from "./validation-failure.d.ts";

/* ---------------------------------------- */
/*  Abstract Data Field                     */
/* ---------------------------------------- */

/**
 * @typedef DataFieldOptions
 * @property [required=false]  Is this field required to be populated?
 * @property [nullable=false]  Can this field have null values?
 * @property [initial]         The initial value of a field, or a function which assigns that initial value.
 * @property [validate]        A data validation function which accepts one argument with the current value.
 * @property [choices]         An array of values or an object of values/labels which represent allowed choices for the
 *                             field. A function may be provided which dynamically returns the array of choices.
 * @property [label]           A localizable label displayed on forms which render this field.
 * @property [hint]            Localizable help text displayed on forms which render this field.
 * @property [validationError] A custom validation error string. When displayed will be prepended with the document
 *                             name, field name, and candidate value.
 */
export interface DataFieldOptions<
    TSourceProp,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> {
    required?: TRequired;
    nullable?: TNullable;
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
    validate?: (value: unknown) => DataModelValidationFailure | boolean | void;
    choices?:
        | readonly TSourceProp[]
        | Record<string, string>
        | (() => readonly TSourceProp[] | Record<string | number, string>);
    readonly?: boolean;
    label?: string;
    hint?: string;
    validationError?: string;
}

interface DataFieldContext {
    /** A field name to assign to the constructed field */
    name?: string;
    /** Another data field which is a hierarchical parent of this one */
    parent?: DataField;
}

/**
 * @typedef DataFieldValidationOptions
 * @property [partial]              Whether this is a partial schema validation, or a complete one.
 * @property [fallback]             Whether to allow replacing invalid values with valid fallbacks.
 * @property [source]               The full source object being evaluated.
 * @property [dropInvalidEmbedded]  If true, invalid embedded documents will emit a warning and be placed in
 *                                  the invalidDocuments collection rather than causing the parent to be
 *                                  considered invalid.
 */
interface DataFieldValidationOptions {
    partial?: boolean;
    fallback?: boolean;
    source?: object;
    dropInvalidEmbedded?: boolean;
}

/**
 * An abstract class that defines the base pattern for a data field within a data schema.
 *
 * @property name             The name of this data field within the schema that contains it
 * @property [required=false] Is this field required to be populated?
 * @property [nullable=false] Can this field have null values?
 * @property initial          The initial value of a field, or a function which assigns that initial value.
 * @property validate         A data validation function which accepts one argument with the current value.
 * @property [readonly=false] Should the prepared value of the field be read-only, preventing it from being
 *                                        changed unless a change to the _source data is applied.
 * @property {string} label               A localizable label displayed on forms which render this field.
 * @property {string} hint                Localizable help text displayed on forms which render this field.
 * @property {string} validationError     A custom validation error string. When displayed will be prepended with the
 *                                        document name, field name, and candidate value.
 */
export abstract class DataField<
    TSourceProp extends JSONValue = JSONValue,
    TModelProp = TSourceProp,
    TRequired extends boolean = boolean,
    TNullable extends boolean = boolean,
    THasInitial extends boolean = boolean,
> implements DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>
{
    /**
     *  @param [options] Options which configure the behavior of the field
     *  @param [context] Additional context which describes the field
     */
    constructor(options?: DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>, context?: DataFieldContext);

    initial: this["options"]["initial"];

    /** The initially provided options which configure the data field */
    options: DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>;

    /**
     * The field name of this DataField instance.
     * This is assigned by `SchemaField#initialize`.
     * @internal
     */
    name: string;

    /**
     * A reference to the parent schema to which this DataField belongs.
     * This is assigned by `SchemaField#initialize`.
     * @internal
     */
    parent: DataSchema | undefined;

    /** Whether this field defines part of a Document/Embedded Document hierarchy. */
    static hierarchical: boolean;

    /**
     * Does this field type contain other fields in a recursive structure?
     * Examples of recursive fields are SchemaField, ArrayField, or TypeDataField
     * Examples of non-recursive fields are StringField, NumberField, or ObjectField
     */
    static recursive: boolean;

    /** Default parameters for this field type */
    protected static get _defaults(): DataFieldOptions<unknown, boolean, boolean, boolean>;

    /** A dot-separated string representation of the field path within the parent schema. */
    get fieldPath(): string;

    /**
     * Apply a function to this DataField which propagates through recursively to any contained data schema.
     * @param fn           The function to apply
     * @param value        The current value of this field
     * @param [options={}] Additional options passed to the applied function
     * @returns The results object
     */
    apply(
        fn: string | ((field: this, value?: unknown, options?: Record<string, unknown>) => unknown),
        value?: unknown,
        options?: Record<string, unknown>,
    ): unknown;

    /* -------------------------------------------- */
    /*  Field Cleaning                              */
    /* -------------------------------------------- */

    /**
     * Coerce source data to ensure that it conforms to the correct data type for the field.
     * Data coercion operations should be simple and synchronous as these are applied whenever a DataModel is constructed.
     * For one-off cleaning of user-provided input the sanitize method should be used.
     * @param value     The initial value
     * @param [options] Additional options for how the field is cleaned
     * @param [options.partial] Whether to perform partial cleaning?
     * @param [options.source]  The root data model being cleaned
     * @returns The cast value
     */
    clean(value: unknown, options?: CleanFieldOptions): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    /**
     * Apply any cleaning logic specific to this DataField type.
     * @param value     The appropriately coerced value.
     * @param [options] Additional options for how the field is cleaned.
     * @returns The cleaned value.
     */
    protected _cleanType(value: unknown, options?: CleanFieldOptions): unknown;

    /**
     * Cast a non-default value to ensure it is the correct type for the field
     * @param value The provided non-default value
     * @returns The standardized value
     */
    protected abstract _cast(value?: unknown): unknown;

    /**
     * Attempt to retrieve a valid initial value for the DataField.
     * @param data The source data object for which an initial value is required
     * @returns A valid initial value
     * @throws An error if there is no valid initial value defined
     */
    getInitialValue(data?: object): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    /* -------------------------------------------- */
    /*  Field Validation                            */
    /* -------------------------------------------- */

    /**
     * Validate a candidate input for this field, ensuring it meets the field requirements.
     * A validation failure can be provided as a raised Error (with a string message), by returning false, or by returning
     * a DataModelValidationFailure instance.
     * A validator which returns true denotes that the result is certainly valid and further validations are unnecessary.
     * @param value          The initial value
     * @param [options={}]   Options which affect validation behavior
     * @returns              Returns a DataModelValidationFailure if a validation failure
     *                       occurred.
     */
    validate(value: unknown, options?: DataFieldValidationOptions): DataModelValidationFailure | void;

    /**
     * Special validation rules which supersede regular field validation.
     * This validator screens for certain values which are otherwise incompatible with this field like null or undefined.
     * @param value The candidate value
     * @returns A boolean to indicate with certainty whether the value is valid.
     *                                Otherwise, return void.
     * @throws May throw a specific error if the value is not valid
     */
    protected _validateSpecial(value: unknown): boolean | void;

    /**
     * A default type-specific validator that can be overridden by child classes
     * @param value The candidate value
     * @param [options={}] Options which affect validation behavior
     * @returns A boolean to indicate with certainty whether the value is valid, or specific DataModelValidationFailure
     *          information, otherwise void.
     * @throws May throw a specific error if the value is not valid
     */
    protected _validateType(
        value: unknown,
        options?: DataFieldValidationOptions,
    ): boolean | DataModelValidationFailure | void;

    /**
     * Certain fields may declare joint data validation criteria.
     * This method will only be called if the field is designated as recursive.
     * @param data       Candidate data for joint model validation
     * @param options    Options which modify joint model validation
     * @throws  An error if joint model validation fails
     * @internal
     */
    _validateModel(data: TSourceProp, options?: DataFieldValidationOptions): void;

    /* -------------------------------------------- */
    /*  Initialization and Serialization            */
    /* -------------------------------------------- */

    /**
     * Initialize the original source data into a mutable copy for the DataModel instance.
     * @param value     The source value of the field
     * @param model     The DataModel instance that this field belongs to
     * @param [options] Initialization options
     */
    initialize(
        value: unknown,
        model?: ConstructorOf<abstract.DataModel>,
        options?: object,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    /**
     * Export the current value of the field into a serializable object.
     * @param value The initialized value of the field
     * @returns An exported representation of the field
     */
    toObject(value: TModelProp): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    /**
     * Recursively traverse a schema and retrieve a field specification by a given path
     * @param path The field path as an array of strings
     */
    protected _getField(path: string[]): DataField | undefined;

    /* -------------------------------------------- */
    /*  Form Field Integration                      */
    /* -------------------------------------------- */

    /** Does this form field class have defined form support? */
    static get hasFormSupport(): boolean;

    /**
     * Render this DataField as an HTML element.
     * @param  [config] Form element configuration parameters
     * @throws          An Error if this DataField subclass does not support input rendering
     * @returns         A rendered HTMLElement for the field
     */
    toInput(config?: FormInputConfig): HTMLElement | HTMLCollection;

    /**
     * Render this DataField as an HTML element.
     * Subclasses should implement this method rather than the public toInput method which wraps it.
     * @param  [config] Form element configuration parameters
     * @throws          An Error if this DataField subclass does not support input rendering
     * @returns         A rendered HTMLElement for the field
     */
    protected _toInput(config?: FormInputConfig): HTMLElement | HTMLCollection;

    /**
     * Render this DataField as a standardized form-group element.
     * @param   [groupConfig] Configuration options passed to the wrapping form-group
     * @param   [inputConfig] Input element configuration options passed to DataField#toInput
     * @returns               The rendered form group element
     */
    toFormGroup(groupConfig?: FormGroupConfig, inputConfig?: FormInputConfig): HTMLDivElement;

    /* -------------------------------------------- */
    /*  Active Effect Integration                   */
    /* -------------------------------------------- */

    /**
     * Apply an ActiveEffectChange to this field.
     * @param   value   The field's current value.
     * @param   model   The model instance.
     * @param   change  The change to apply.
     * @returns         The updated value.
     */
    applyChange(value: unknown, model: abstract.DataModel, change: EffectChangeData): unknown;

    /**
     * Cast a change delta into an appropriate type to be applied to this field.
     * @param   delta  The change delta.
     * @internal
     */
    _castChangeDelta(delta: unknown): unknown;

    /**
     * Apply an ADD change to this field.
     * @param   value   The field's current value.
     * @param   delta   The change delta.
     * @param   model   The model instance.
     * @param   change  The original change data.
     * @returns         The updated value.
     */
    protected _applyChangeAdd(
        value: unknown,
        delta: unknown,
        model: abstract.DataModel,
        change: EffectChangeData,
    ): unknown;

    /**
     * Apply a MULTIPLY change to this field.
     * @param   value   The field's current value.
     * @param   delta   The change delta.
     * @param   model   The model instance.
     * @param   change  The original change data.
     * @returns         The updated value.
     */
    protected _applyChangeMultiply(
        value: unknown,
        delta: unknown,
        model: abstract.DataModel,
        change: EffectChangeData,
    ): unknown;

    /**
     * Apply an OVERRIDE change to this field.
     * @param   value   The field's current value.
     * @param   delta   The change delta.
     * @param   model   The model instance.
     * @param   change  The original change data.
     * @returns         The updated value.
     */
    protected _applyChangeOverride(
        value: unknown,
        delta: unknown,
        model: abstract.DataModel,
        change: EffectChangeData,
    ): unknown;

    /**
     * Apply an UPGRADE change to this field.
     * @param   value   The field's current value.
     * @param   delta   The change delta.
     * @param   model   The model instance.
     * @param   change  The original change data.
     * @returns         The updated value.
     */
    protected _applyChangeUpgrade(
        value: unknown,
        delta: unknown,
        model: abstract.DataModel,
        change: EffectChangeData,
    ): unknown;

    /**
     * Apply a DOWNGRADE change to this field.
     * @param   value   The field's current value.
     * @param   delta   The change delta.
     * @param   model   The model instance.
     * @param   change  The original change data.
     * @returns         The updated value.
     */
    protected _applyChangeDowngrade(
        value: unknown,
        delta: unknown,
        model: abstract.DataModel,
        change: EffectChangeData,
    ): unknown;

    /**
     * Apply a CUSTOM change to this field.
     * @param   value   The field's current value.
     * @param   delta   The change delta.
     * @param   model   The model instance.
     * @param   change  The original change data.
     * @returns         The updated value.
     */
    protected _applyChangeCustom(
        value: unknown,
        delta: unknown,
        model: abstract.DataModel,
        change: EffectChangeData,
    ): unknown;
}

/* -------------------------------------------- */
/*  Data Schema Field                           */
/* -------------------------------------------- */

export type DataSchema = Record<string, DataField<JSONValue, unknown, boolean>>;

/** A special class of {@link DataField} which defines a data schema. */
export class SchemaField<
    TDataSchema extends DataSchema = DataSchema,
    TSourceProp extends SourceFromSchema<TDataSchema> = SourceFromSchema<TDataSchema>,
    TModelProp extends NonNullable<JSONValue> = ModelPropsFromSchema<TDataSchema>,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends DataField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    /**
     * @param fields    The contained field definitions
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     */
    constructor(
        fields: TDataSchema,
        options?: DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    protected static override get _defaults(): DataFieldOptions<object, boolean, boolean, boolean>;

    /** The contained field definitions. */
    fields: TDataSchema;

    /**
     * Initialize and validate the structure of the provided field definitions.
     * @param fields The provided field definitions
     * @returns The validated schema
     */
    protected _initialize(fields: DataSchema): DataSchema;

    /* -------------------------------------------- */
    /*  Schema Iteration                            */
    /* -------------------------------------------- */

    /** Iterate over a SchemaField by iterating over its fields. */
    [Symbol.iterator](): Generator<DataField<TSourceProp, TRequired, TNullable, THasInitial>>;

    /** An array of field names which are present in the schema. */
    keys(): string[];

    /** An array of DataField instances which are present in the schema. */
    values(): DataField[];

    /** An array of [name, DataField] tuples which define the schema. */
    entries(): [string, DataField][];

    /**
     * Test whether a certain field name belongs to this schema definition.
     * @param fieldName The field name
     * @returns Does the named field exist in this schema?
     */
    has(fieldName: string): boolean;

    /**
     * Get a DataField instance from the schema by name
     * @param fieldName The field name
     * @returns The DataField instance or undefined
     */
    get(fieldName: string): DataField | undefined;

    /* -------------------------------------------- */
    /*  Data Field Methods                          */
    /* -------------------------------------------- */

    protected override _cast(value: unknown): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    protected override _cleanType(
        data: object,
        options?: CleanFieldOptions,
    ): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    override initialize(
        value: unknown,
        model?: ConstructorOf<abstract.DataModel>,
        options?: Record<string, unknown>,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    protected override _validateType(
        data: object,
        options?: DataFieldValidationOptions,
    ): boolean | DataModelValidationFailure | void;

    override toObject(value: TModelProp): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    override apply(
        fn: string | ((field: this, value?: unknown, options?: Record<string, unknown>) => unknown),
        data?: object,
        options?: Record<string, unknown>,
    ): unknown;
}

export interface CleanFieldOptions {
    partial?: boolean;
    source?: object;
}

/* -------------------------------------------- */
/*  Basic Field Types                           */
/* -------------------------------------------- */

type BooleanFieldOptions<
    TSourceProp extends boolean,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> = Omit<DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>, "choices">;

/** A subclass of [DataField]{@link DataField} which deals with boolean-typed data. */
export class BooleanField<
    TSourceProp extends boolean = boolean,
    TModelProp extends NonNullable<JSONValue> = TSourceProp,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends DataField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected static override get _defaults(): BooleanFieldOptions<boolean, boolean, boolean, boolean>;

    protected override _cast(value: unknown): unknown;

    protected override _validateType(value: unknown): value is boolean;
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
}

/** A subclass of [DataField]{@link DataField} which deals with number-typed data. */
export class NumberField<
        TSourceProp extends number = number,
        TModelProp extends NonNullable<JSONValue> = TSourceProp,
        TRequired extends boolean = false,
        TNullable extends boolean = true,
        THasInitial extends boolean = true,
    >
    extends DataField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial>
    implements NumberFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>
{
    /**
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     * */
    constructor(
        options?: NumberFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    protected static override get _defaults(): NumberFieldOptions<number, boolean, boolean, boolean>;

    protected override _cast(value: unknown): unknown;

    protected override _cleanType(
        value: unknown,
        options?: CleanFieldOptions,
    ): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    protected override _validateType(value: unknown): void;
}

interface StringFieldOptions<
    TSourceProp extends string,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {
    choices?:
        | readonly TSourceProp[]
        | Record<TSourceProp, string>
        | (() => readonly TSourceProp[] | Record<TSourceProp, string>);
    /** [blank=true] Is the string allowed to be blank (empty)? */
    blank?: boolean;
    /** [trim=true]  Should any provided string be trimmed as part of cleaning? */
    trim?: boolean;
}

/** A subclass of `DataField` which deals with string-typed data. */
export class StringField<
        TSourceProp extends string = string,
        TModelProp extends NonNullable<JSONValue> = TSourceProp,
        TRequired extends boolean = false,
        TNullable extends boolean = false,
        THasInitial extends boolean = true,
    >
    extends DataField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial>
    implements StringFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>
{
    /**
     * @param [option] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     * */
    constructor(
        options?: StringFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    protected static override get _defaults(): StringFieldOptions<string, boolean, boolean, boolean>;

    override clean(
        value: unknown,
        options: CleanFieldOptions,
    ): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    protected override _cast(value: unknown): unknown;

    protected override _validateSpecial(value: unknown): boolean | void;

    protected _validateType(value: unknown): boolean | void;
}

type ObjectFieldOptions<
    TSourceProp extends object,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> = DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>;

/** A subclass of `DataField` which deals with object-typed data. */
export class ObjectField<
        TSourceProp extends object,
        TModelProp extends object = TSourceProp,
        TRequired extends boolean = true,
        TNullable extends boolean = false,
        THasInitial extends boolean = true,
    >
    extends DataField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial>
    implements Omit<ObjectFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>, "initial">
{
    protected static override get _defaults(): ObjectFieldOptions<object, boolean, boolean, boolean>;

    protected override _cast(value: unknown): unknown;

    override initialize(
        value: unknown,
        model?: ConstructorOf<abstract.DataModel>,
        options?: ObjectFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    override toObject(value: TModelProp): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    protected override _validateType(
        value: unknown,
        options?: DataFieldValidationOptions,
    ): DataModelValidationFailure | boolean | void;
}

type ArrayFieldOptions<
    TSourceProp extends unknown[],
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> = DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> & {
    min?: number;
    max?: number;
};

/** A subclass of `DataField` which deals with array-typed data. */
export class ArrayField<
        TElementField extends DataField,
        TSourceProp extends Partial<
            SourcePropFromDataField<TElementField>
        >[] = SourcePropFromDataField<TElementField>[],
        TModelProp extends object = ModelPropFromDataField<TElementField>[],
        TRequired extends boolean = false,
        TNullable extends boolean = false,
        THasInitial extends boolean = true,
    >
    extends DataField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial>
    implements ArrayFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>
{
    /**
     * @param element   A DataField instance which defines the type of element contained in the Array.
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     */
    constructor(
        element: TElementField,
        options?: ArrayFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    /** The data type of each element in this array */
    element: TElementField;

    /**
     * Validate the contained element type of the ArrayField
     * @param element The type of Array element
     * @returns The validated element type
     * @throws An error if the element is not a valid type
     */
    protected static _validateElementType(element: unknown): unknown;

    override _validateModel(changes: TSourceProp, options?: DataFieldValidationOptions): void;

    protected static override get _defaults(): ArrayFieldOptions<unknown[], boolean, boolean, boolean>;

    protected override _cast(value: unknown): unknown;

    protected _cleanType(value: unknown, options?: CleanFieldOptions): unknown;

    protected override _validateType(value: unknown, options?: DataFieldValidationOptions): void;

    /**
     * Validate every element of the ArrayField
     * @param value   The array to validate
     * @param options Validation options
     * @returns An array of element-specific errors
     */
    protected _validateElements(
        value: unknown[],
        options?: DataFieldValidationOptions,
    ): DataModelValidationFailure | void;

    override initialize(
        value: JSONValue,
        model: ConstructorOf<abstract.DataModel>,
        options: ArrayFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    override toObject(value: TModelProp): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    override apply(
        fn: string | ((field: this, value?: unknown, options?: Record<string, unknown>) => unknown),
        data?: object,
        options?: Record<string, unknown>,
    ): unknown;
}

export interface ArrayField<
    TElementField extends DataField,
    TSourceProp extends Partial<SourcePropFromDataField<TElementField>>[] = SourcePropFromDataField<TElementField>[],
    TModelProp extends object = ModelPropFromDataField<TElementField>[],
    TRequired extends boolean = false,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends DataField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    clean(value: unknown, options?: CleanFieldOptions): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;
}

/**
 * A subclass of `ArrayField` which supports a set of contained elements.
 * Elements in this set are treated as fungible and may be represented in any order or discarded if invalid.
 */
export class SetField<
    TElementField extends DataField,
    TSourceProp extends SourcePropFromDataField<TElementField>[] = SourcePropFromDataField<TElementField>[],
    TModelProp extends Set<ModelPropFromDataField<TElementField>> = Set<ModelPropFromDataField<TElementField>>,
    TRequired extends boolean = false,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends ArrayField<TElementField, TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected override _validateElements(
        value: unknown[],
        options?: DataFieldValidationOptions,
    ): DataModelValidationFailure | void;

    override initialize(
        value: TSourceProp,
        model: ConstructorOf<abstract.DataModel>,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    override toObject(value: TModelProp): TSourceProp;
}

/** A subclass of `SchemaField` which embeds some other DataModel definition as an inner object. */
export class EmbeddedDataField<
    TModelProp extends abstract.DataModel = abstract.DataModel,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends SchemaField<
    TModelProp["schema"]["fields"],
    TModelProp["_source"],
    TModelProp,
    TRequired,
    TNullable,
    THasInitial
> {
    /**
     * @param model     The class of DataModel which should be embedded in this field
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     */
    constructor(
        model: ConstructorOf<TModelProp>,
        options?: ObjectFieldOptions<
            SourceFromSchema<TModelProp["schema"]["fields"]>,
            TRequired,
            TNullable,
            THasInitial
        >,
        context?: DataFieldContext,
    );

    /** The embedded DataModel definition which is contained in this field. */
    model: ConstructorOf<TModelProp>;

    protected override _initialize(fields: DataSchema): DataSchema;

    override initialize(
        value: MaybeSchemaProp<TModelProp["_source"], TRequired, TNullable, THasInitial>,
        model: ConstructorOf<abstract.DataModel>,
        options?: object,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    override toObject(
        value: TModelProp,
    ): MaybeSchemaProp<SourceFromSchema<TModelProp["schema"]["fields"]>, TRequired, TNullable, THasInitial>;
}

/** A subclass of {@link EmbeddedDataField} which supports a single embedded Document. */
export class EmbeddedDocumentField<
    TModelProp extends abstract.Document,
    TRequired extends boolean = true,
    TNullable extends boolean = true,
    THasInitial extends boolean = true,
> extends EmbeddedDataField<TModelProp, TRequired, TNullable, THasInitial> {
    /**
     * @param model     The type of Document which is embedded.
     * @param [options] Options which configure the behavior of the field.
     * @param [context] Additional context which describes the field
     */
    constructor(
        model: ConstructorOf<TModelProp>,
        options?: DataFieldOptions<TModelProp["_source"], TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    static override get _defaults(): DataFieldOptions<object, boolean, true, boolean>;

    static override hierarchical: boolean;

    override initialize(
        value: MaybeSchemaProp<TModelProp["_source"], TRequired, TNullable, THasInitial>,
        model: ConstructorOf<TModelProp>,
        options?: Record<string, unknown>,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    /* -------------------------------------------- */
    /*  Embedded Document Operations                */
    /* -------------------------------------------- */

    /**
     * Return the embedded document(s) as a Collection.
     * @param parent The parent document.
     */
    getCollection(parent: abstract.Document): Collection<TModelProp>;
}

/**
 * A subclass of `ArrayField` which supports an embedded Document collection.
 * Invalid elements will be dropped from the collection during validation rather than failing for the field entirely.
 */
export class EmbeddedCollectionField<
    TDocument extends abstract.Document<abstract.Document>,
    TSourceProp extends object[] = SourceFromDocument<TDocument>[],
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends ArrayField<
    TDocument["schema"],
    TSourceProp,
    abstract.EmbeddedCollection<TDocument>,
    TRequired,
    TNullable,
    THasInitial
> {
    /**
     * @param element   The type of Document which belongs to this embedded collection
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     */
    constructor(
        element: ConstructorOf<Document>,
        options?: ArrayFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    static override _validateElementType(element: unknown): Document;

    /** A reference to the DataModel subclass of the embedded document element */
    get model(): ConstructorOf<Document>;

    /** The DataSchema of the contained Document model. */
    get schema(): TDocument["schema"];

    protected override _cleanType(
        value: unknown,
        options?: CleanFieldOptions,
    ): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    protected override _validateElements(
        value: unknown[],
        options?: DataFieldValidationOptions,
    ): DataModelValidationFailure | void;

    override initialize(
        _value: unknown,
        model: ConstructorOf<abstract.DataModel>,
    ): MaybeSchemaProp<abstract.EmbeddedCollection<TDocument>, TRequired, TNullable, THasInitial>;

    override toObject(
        value: abstract.EmbeddedCollection<TDocument>,
    ): MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>;

    override apply(
        fn: string | ((field: this, value?: unknown, options?: Record<string, unknown>) => unknown),
        data?: object,
        options?: Record<string, unknown>,
    ): unknown;
}

/**
 * A subclass of {@link EmbeddedCollectionField} which manages a collection of delta objects relative to another
 * collection.
 * @todo: fill in
 */
export class EmbeddedCollectionDeltaField<
    TDocument extends abstract.Document<abstract.Document>,
    TSource extends (SourceFromDocument<TDocument> | SourceFromSchema<TombstoneDataSchema>)[] = (
        | SourceFromDocument<TDocument>
        | SourceFromSchema<TombstoneDataSchema>
    )[],
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends EmbeddedCollectionField<TDocument, TSource, TRequired, TNullable, THasInitial> {}

/* -------------------------------------------- */
/*  Special Field Types                         */
/* -------------------------------------------- */

/**
 * A subclass of [StringField]{@link StringField} which provides the primary _id for a Document.
 * The field may be initially null, but it must be non-null when it is saved to the database.
 */
export class DocumentIdField<
    TModelProp extends string | abstract.Document = string,
    TRequired extends boolean = true,
    TNullable extends boolean = true,
    THasInitial extends boolean = true,
> extends StringField<string, TModelProp, TRequired, TNullable, THasInitial> {
    protected static override get _defaults(): StringFieldOptions<string, boolean, boolean, boolean>;

    protected override _cast(value: unknown): string;

    protected override _validateType(value: unknown): boolean;
}

interface DocumentUUIDFieldOptions<TRequired extends boolean, TNullable extends boolean, THasInitial extends boolean>
    extends StringFieldOptions<DocumentUUID, TRequired, TNullable, THasInitial> {
    /** A specific document type in CONST.ALL_DOCUMENT_TYPES required by this field */
    type?: (typeof ALL_DOCUMENT_TYPES)[number];
    /** Does this field require (or prohibit) embedded documents? */
    embedded?: boolean;
}

/**
 * A subclass of {@link StringField} which supports referencing some other Document by its UUID.
 * This field may not be blank, but may be null to indicate that no UUID is referenced.
 */
export class DocumentUUIDField<
    TSourceProp extends DocumentUUID = DocumentUUID,
    TRequired extends boolean = true,
    TNullable extends boolean = true,
    THasInitial extends boolean = true,
> extends StringField<TSourceProp, TSourceProp, TRequired, TNullable, THasInitial> {
    /**
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     */
    constructor(options?: DocumentUUIDFieldOptions<TRequired, TNullable, THasInitial>, context?: DataFieldContext);

    protected override _cast(value: unknown): string;
}

interface ForeignDocumentFieldOptions<
    TSourceProp extends string,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends StringFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {
    idOnly?: boolean;
}

/**
 * A special class of [StringField]{@link StringField} field which references another DataModel by its id.
 * This field may also be null to indicate that no foreign model is linked.
 */
export class ForeignDocumentField<
    TModelProp extends string | abstract.Document = abstract.Document,
    TRequired extends boolean = true,
    TNullable extends boolean = true,
    THasInitial extends boolean = true,
> extends DocumentIdField<TModelProp, TRequired, TNullable, THasInitial> {
    /**
     * @param model     The foreign DataModel class definition which this field should link to.
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     */
    constructor(
        model: ConstructorOf<abstract.DataModel>,
        options?: ForeignDocumentFieldOptions<string, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    /** A reference to the model class which is stored in this field */
    model: abstract.DataModel;

    protected static override get _defaults(): StringFieldOptions<string, boolean, boolean, boolean>;

    _cast(value: unknown): string;

    override initialize(
        value: string,
        model: ConstructorOf<abstract.DataModel>,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    toObject(value: TModelProp): MaybeSchemaProp<string, TRequired, TNullable, THasInitial>;
}

/** A special `StringField` which records a standardized CSS color string. */
export class ColorField<
    TRequired extends boolean = false,
    TNullable extends boolean = true,
    THasInitial extends boolean = true,
> extends StringField<HexColorString, Color, TRequired, TNullable, THasInitial> {
    protected static override get _defaults(): StringFieldOptions<HexColorString, boolean, boolean, boolean>;

    protected override _validateType(value: unknown): boolean;
}

/**
 * @typedef FilePathFieldOptions
 * @property [categories]   A set of categories in CONST.FILE_CATEGORIES which this field supports
 * @property [base64=false] Is embedded base64 data supported in lieu of a file path?
 */
interface FilePathFieldOptions<
    TSourceProp extends FilePath,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends StringFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {
    categories?: FileCategory[];
    base64?: boolean;
}

/** A special `StringField` which records a file path or inline base64 data. */
export class FilePathField<
    TSourceProp extends FilePath = FilePath,
    TModelProp extends NonNullable<JSONValue> = TSourceProp,
    TRequired extends boolean = false,
    TNullable extends boolean = true,
    THasInitial extends boolean = true,
> extends StringField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    /**
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     * */
    constructor(
        options?: FilePathFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    protected static override get _defaults(): FilePathFieldOptions<FilePath, boolean, boolean, boolean>;

    protected override _validateType(value: unknown): void;
}

interface AngleFieldOptions<
    TSourceProp extends number,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends NumberFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> {
    min?: number;
    max?: number;
    step?: number;
    integer?: boolean;
    base?: 360 | 0;
}

/**
 * A special `NumberField` which represents an angle of rotation in degrees between 0 and 360.
 * @property base Whether the base angle should be treated as 360 or as 0
 */
export class AngleField<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends NumberField<number, number, TRequired, TNullable, THasInitial> {
    protected static override get _defaults(): AngleFieldOptions<number, boolean, boolean, boolean>;

    protected override _cast(value: unknown): number;
}

/** A special `NumberField` represents a number between 0 and 1. */
export class AlphaField<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends NumberField<number, number, TRequired, TNullable, THasInitial> {
    protected static get _defaults(): NumberFieldOptions<number, boolean, boolean, boolean>;
}

/**
 * A special `NumberField` represents a number between 0 (inclusive) and 1 (exclusive).
 * Its values are normalized (modulo 1) to the range [0, 1) instead of being clamped.
 */
export class HueField<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends NumberField<number, number, TRequired, TNullable, THasInitial> {
    protected static get _defaults(): NumberFieldOptions<number, boolean, boolean, boolean>;
}

/** A special `ObjectField` which captures a mapping of User IDs to Document permission levels. */
export class DocumentOwnershipField extends ObjectField<{ [K in string]?: DocumentOwnershipLevel }> {
    protected static override get _defaults(): ObjectFieldOptions<
        Record<string, DocumentOwnershipLevel | undefined>,
        true,
        false,
        true
    >;

    protected override _validateType(value: object): boolean | void;
}

/** A special [StringField]{@link StringField} which contains serialized JSON data. */
export class JSONField<
    TModelProp extends NonNullable<JSONValue> = object,
    TRequired extends boolean = false,
    TNullable extends boolean = false,
    THasInitial extends boolean = false,
> extends StringField<string, TModelProp, TRequired, TNullable, THasInitial> {
    protected static override get _defaults(): StringFieldOptions<string, boolean, boolean, boolean>;

    override clean(
        value: unknown,
        options?: CleanFieldOptions,
    ): MaybeSchemaProp<string, TRequired, TNullable, THasInitial>;

    protected override _validateType(value: unknown): boolean;

    override initialize(value: string): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;

    toObject(value: TModelProp): MaybeSchemaProp<string, TRequired, TNullable, THasInitial>;
}

/**
 * A subclass of [StringField]{@link StringField} which contains a sanitized HTML string.
 * This class does not override any StringField behaviors, but is used by the server-side to identify fields which
 * require sanitization of user input.
 */
export class HTMLField<
    TSourceProp extends string = string,
    TModelProp extends NonNullable<JSONValue> = TSourceProp,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends StringField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected static override get _defaults(): StringFieldOptions<string, boolean, boolean, boolean>;
}

/** A subclass of `NumberField` which is used for storing integer sort keys. */
export class IntegerSortField<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends NumberField<number, number, TRequired, TNullable, THasInitial> {
    protected static override get _defaults(): NumberFieldOptions<number, boolean, boolean, boolean>;
}

/**
 * A subclass of {@link SchemaField} which stores document metadata in the _stats field.
 * @mixes DocumentStats
 */
export class DocumentStatsField<TDocumentUUID extends DocumentUUID = DocumentUUID> extends SchemaField<
    DocumentStatsSchema<TDocumentUUID>
> {
    constructor(options?: ObjectFieldOptions<DocumentStatsSchema, true, false, true>, context?: DataFieldContext);
}

type DocumentStatsSchema<TDocumentUUID extends DocumentUUID = DocumentUUID> = {
    /** The package name of the system the Document was created in. */
    systemId: StringField<string, string, true, false, true>;
    /** The version of the system the Document was created or last modified in. */
    systemVersion: StringField<string, string, true, false, true>;
    /** The core version the Document was created in. */
    coreVersion: StringField<string, string, true, false, true>;
    /** A timestamp of when the Document was created. */
    createdTime: NumberField;
    /** A timestamp of when the Document was last modified. */
    modifiedTime: NumberField;
    /** The ID of the user who last modified the Document. */
    lastModifiedBy: ForeignDocumentField<string>;
    /** The UUID of the compendium Document this one was imported from. */
    compendiumSource: DocumentUUIDField<TDocumentUUID>;
    /** The UUID of the Document this one is a duplicate of. */
    duplicateSource: DocumentUUIDField<TDocumentUUID>;
};

export type DocumentStatsData = SourceFromSchema<DocumentStatsSchema>;

/**
 * A subclass of [StringField]{@link StringField} that is used specifically for the Document "type" field.
 */
export class DocumentTypeField<
    TSourceProp extends string = string,
    TModelProp extends string = TSourceProp,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
    TDocument extends abstract.Document = abstract.Document,
> extends StringField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    /**
     * @param documentClass  The base document class which belongs in this field
     * @param [options]      Options which configure the behavior of the field
     * @param [context]      Additional context which describes the field
     */
    constructor(
        documentClass: ConstructorOf<TDocument>,
        options?: StringFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );
}

/** A subclass of `ObjectField` which supports a system-level data object. */
export class TypeDataField<
    TSourceProp extends object = object,
    TModelProp extends object = TSourceProp,
    TDocument extends abstract.Document = abstract.Document,
> extends ObjectField<TSourceProp, TModelProp> {
    /**
     * @param document   The base document class which belongs in this field
     * @param [options]  Options which configure the behavior of the field
     * @param [context]  Additional context which describes the field
     */
    constructor(
        document: ConstructorOf<TDocument>,
        options?: ObjectFieldOptions<TSourceProp, true, false, true>,
        context?: DataFieldContext,
    );

    /** The canonical document name of the document type which belongs in this field */
    document: ConstructorOf<TDocument>;

    protected static override get _defaults(): ObjectFieldOptions<object, true, false, true>;

    static override recursive: boolean;

    /**
     * Return the package that provides the sub-type for the given model.
     * @param {DataModel} model       The model instance created for this sub-type.
     * @returns {System|Module|null}
     */
    static getModelProvider(model: abstract.DataModel): abstract.DataModel | null;

    /** A convenience accessor for the name of the document type associated with this TypeDataField */
    get documentName(): TDocument["documentName"];

    /**
     * Get the DataModel definition that should be used for this type of document.
     * @param type The Document instance type
     * @returns {typeof DataModel|null}  The DataModel class or null
     */
    getModelForType(type: string): typeof abstract.DataModel | null;

    override getInitialValue(data: object): TSourceProp;

    protected override _cleanType(value: unknown, options?: CleanFieldOptions): TSourceProp;

    override initialize(
        value: TSourceProp,
        model?: ConstructorOf<TDocument>,
        options?: Record<string, unknown>,
    ): MaybeSchemaProp<TModelProp, true, false, true>;

    protected override _validateType(
        data: unknown,
        options?: DataFieldValidationOptions,
    ): void | DataModelValidationFailure;

    override _validateModel(changes: TSourceProp, options?: DataFieldValidationOptions): void;

    override toObject(value: TModelProp): TSourceProp;

    /**
     * Migrate this field's candidate source data.
     * @param sourceData Candidate source data of the root model
     * @param fieldData  The value of this field within the source data
     */
    migrateSource(sourceData: Record<string, unknown>, fieldData: Record<string, unknown>): void;
}

/** A subclass of [DataField]{@link DataField} which allows to typed schemas. */
export class TypedSchemaField<
    TTypes extends Record<string, DataSchema | SchemaField | ConstructorOf<abstract.DataModel>>,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = false,
> extends DataField<
    SourceFromTypedSchemaTypes<TTypes>,
    ModelFromTypedSchemaTypes<TTypes>,
    TRequired,
    TNullable,
    THasInitial
> {
    /**
     * @param types     The different types this field can represent.
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     */
    constructor(
        types: TTypes,
        options?: DataFieldOptions<SourceFromTypedSchemaTypes<TTypes>, TRequired, TNullable, THasInitial>,
        context?: DataFieldContext,
    );

    static override get _defaults(): DataFieldOptions<object, boolean, boolean, boolean>;

    /** The types of this field. */
    types: TTypes;

    protected override _getField(path: string[]): DataField;

    /* -------------------------------------------- */
    /*  Data Field Methods                          */
    /* -------------------------------------------- */

    protected override _cleanType(value: JSONValue | undefined, options: CleanFieldOptions): JSONValue | undefined;

    protected override _cast(value: JSONValue): object;

    protected override _validateSpecial(value: JSONValue | undefined): boolean | void;

    protected override _validateType(
        value: unknown,
        options?: DataFieldValidationOptions,
    ): boolean | DataModelValidationFailure | void;

    override initialize(
        value: JSONValue | undefined,
        model?: ConstructorOf<abstract.DataModel>,
        options?: object,
    ): MaybeSchemaProp<ModelFromTypedSchemaTypes<TTypes>, TRequired, TNullable, THasInitial>;

    override toObject(
        value: ModelFromTypedSchemaTypes<TTypes>,
    ): MaybeSchemaProp<SourceFromTypedSchemaTypes<TTypes>, TRequired, TNullable, THasInitial>;

    override apply(
        fn: string | ((field: this, value?: unknown, options?: Record<string, unknown>) => unknown),
        value?: unknown,
        options?: Record<string, unknown>,
    ): unknown;

    /**
     * Migrate this field's candidate source data.
     * @param sourceData Candidate source data of the root model
     * @param fieldData  The value of this field within the source data
     */
    migrateSource(sourceData: object, fieldData: JSONValue | undefined): void;
}

type SourceMapFromTypedSchemaTypes<
    TTypes extends Record<string, DataSchema | SchemaField | ConstructorOf<abstract.DataModel>>,
> = {
    [K in keyof TTypes]: TTypes[K] extends ConstructorOf<abstract.DataModel>
        ? InstanceType<TTypes[K]>["_source"]
        : TTypes[K] extends SchemaField
          ? SourcePropFromDataField<TTypes[K]>
          : TTypes[K] extends DataSchema
            ? SourceFromSchema<TTypes[K]>
            : Record<string, JSONValue>;
};

type SourceFromTypedSchemaTypes<
    TTypes extends Record<string, DataSchema | SchemaField | ConstructorOf<abstract.DataModel>>,
> = SourceMapFromTypedSchemaTypes<TTypes>[keyof TTypes];

type ModelMapFromTypedSchemaTypes<
    TTypes extends Record<string, DataSchema | SchemaField | ConstructorOf<abstract.DataModel>>,
> = {
    [K in keyof TTypes]: TTypes[K] extends ConstructorOf<abstract.DataModel>
        ? InstanceType<TTypes[K]>
        : TTypes[K] extends SchemaField
          ? ModelPropFromDataField<TTypes[K]>
          : TTypes[K] extends DataSchema
            ? ModelPropsFromSchema<TTypes[K]>
            : object;
};

type ModelFromTypedSchemaTypes<
    TTypes extends Record<string, DataSchema | SchemaField | ConstructorOf<abstract.DataModel>>,
> = ModelMapFromTypedSchemaTypes<TTypes>[keyof TTypes];

interface JavaScriptFieldOptions<TRequired extends boolean, TNullable extends boolean, THasInitial extends boolean>
    extends StringFieldOptions<string, TRequired, TNullable, THasInitial> {
    /** Does the field allow async code? Default: false */
    async?: boolean;
}

/** A subclass of {@link StringField} which contains JavaScript code. */
export class JavaScriptField<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = false,
> extends StringField<string, string, TRequired, TNullable, THasInitial> {
    /**
     * @param [options] Options which configure the behavior of the field
     * @param [context] Additional context which describes the field
     */
    constructor(options?: JavaScriptFieldOptions<TRequired, TNullable, THasInitial>, context?: DataFieldContext);
}

// System utility types

export type SourcePropFromDataField<T> =
    T extends DataField<infer TSourceProp, infer _TModelProp, infer TRequired, infer TNullable, infer THasInitial>
        ? MaybeSchemaProp<TSourceProp, TRequired, TNullable, THasInitial>
        : never;

export type SourceFromDocument<T extends abstract.Document> = SourcePropFromDataField<T["schema"]>;
export type ModelPropFromDataField<T> =
    T extends DataField<infer _TSourceProp, infer TModelProp, infer TRequired, infer TNullable, infer THasInitial>
        ? MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>
        : never;

export type MaybeSchemaProp<
    TProp,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> = TRequired extends true
    ? TNullable extends true
        ? TProp | null
        : TProp
    : TNullable extends true
      ? THasInitial extends true
          ? TProp | null
          : TProp | null | undefined
      : THasInitial extends true
        ? TProp
        : TProp | undefined;

declare global {
    type ModelPropsFromSchema<TDataSchema extends DataSchema> = {
        [K in keyof TDataSchema]: ModelPropFromDataField<TDataSchema[K]>;
    };

    type SourceFromSchema<TDataSchema extends DataSchema> = {
        [K in keyof TDataSchema]: SourcePropFromDataField<TDataSchema[K]>;
    };

    type DocumentSourceFromSchema<TDataSchema extends DataSchema, THasId extends boolean = boolean> = {
        [K in keyof TDataSchema]: K extends "_id"
            ? THasId extends true
                ? string
                : THasId extends false
                  ? null
                  : string | null
            : SourcePropFromDataField<TDataSchema[K]>;
    };

    type HexColorString = `#${string}`;
    type AudioFilePath = `${string}.${AudioFileExtension}`;
    type ImageFilePath = `${string}.${ImageFileExtension}`;
    type VideoFilePath = `${string}.${VideoFileExtension}`;
    type FilePath = AudioFilePath | ImageFilePath | VideoFilePath;
}
