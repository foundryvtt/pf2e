import { DataModel, EmbeddedCollection } from "../abstract/module.mjs";

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
                               field. A function may be provided which dynamically returns the array of choices.
 * @property [label]           A localizable label displayed on forms which render this field.
 * @property [hint]            Localizable help text displayed on forms which render this field.
 * @property [validationError] A custom validation error string. When displayed will be prepended with the
 *                             document name, field name, and candidate value.
 */
export interface DataFieldOptions<TSourceProp extends unknown, TNullable extends boolean> {
    required?: boolean;
    nullable?: TNullable;
    initial?: unknown;
    validate?: (value: unknown) => Error | void;
    choices?: readonly TSourceProp[] | Record<string, string> | Function;
    label?: string;
    hint?: string;
    validationError?: string;
}

export abstract class DataField<
    TSourceProp extends unknown = unknown,
    TModelProp = TSourceProp,
    TNullable extends boolean = boolean
> implements DataFieldOptions<TSourceProp, TNullable>
{
    /** @param options Options which configure the behavior of the field */
    constructor(options?: DataFieldOptions<TSourceProp, TNullable>);

    /** The initially provided options which configure the data field */
    options: DataFieldOptions<TSourceProp, TNullable>;

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

    /** Default parameters for this field type */
    protected static get _defaults(): DataFieldOptions<unknown, boolean>;

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
        options?: Record<string, unknown>
    ): TSourceProp;

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
    clean(value: unknown, options?: CleanFieldOptions): TNullable extends false ? TSourceProp : TSourceProp | null;

    /**
     * Apply any cleaning logic specific to this DataField type.
     * @param value     The appropriately coerced value.
     * @param [options] Additional options for how the field is cleaned.
     * @returns The cleaned value.
     */
    protected _cleanType(value?: unknown, options?: CleanFieldOptions): Maybe<TSourceProp>;

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
    getInitialValue(data: object): unknown;

    /* -------------------------------------------- */
    /*  Field Validation                            */
    /* -------------------------------------------- */

    /**
     * Validate a candidate input for this field, ensuring it meets the field requirements.
     * A validation failure can be provided as a raised Error (with a string message) or by returning false.
     * A validator which returns true denotes that the result is certainly valid and further validations are unnecessary.
     * @param value The initial value
     * @param [options={}] Options which affect validation behavior
     * @returns Returns a `ModelValidationError` if a validation failure occurred
     */
    validate(value: unknown, options?: Record<string, unknown>): ModelValidationError | void;

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
     * @returns A boolean to indicate with certainty whether the value is valid. Otherwise, return void.
     * @throws May throw a specific error if the value is not valid
     */
    protected _validateType(value: unknown, options?: Record<string, unknown>): boolean | void;

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
        model?: ConstructorOf<DataModel>,
        options?: object
    ): TNullable extends true ? TModelProp | null : TModelProp;

    /**
     * Export the current value of the field into a serializable object.
     * @param value The initialized value of the field
     * @returns An exported representation of the field
     */
    toObject(value: TModelProp): TNullable extends true ? TSourceProp | null : TSourceProp;
}

/* -------------------------------------------- */
/*  Data Schema Field                           */
/* -------------------------------------------- */

export type DataSchema = Record<string, DataField<unknown, unknown, boolean>>;

/** A special class of {@link DataField} which defines a data schema. */
export class SchemaField<
    TSourceProp extends DataSchema = DataSchema,
    TModelProp = TSourceProp,
    TNullable extends boolean = false
> extends DataField<TSourceProp, TModelProp, TNullable> {
    /**
     * @param fields  The contained field definitions
     * @param options Options which configure the behavior of the field
     */
    constructor(fields: DataSchema, options?: DataFieldOptions<TSourceProp, TNullable>);

    protected static override get _defaults(): DataFieldOptions<DataSchema, boolean>;

    /** The contained field definitions. */
    fields: DataSchema;

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
    [Symbol.iterator](): Generator<DataField<TSourceProp, TNullable>>;

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

    protected override _cast(value: unknown): TSourceProp;

    protected override _cleanType(data: object, options?: CleanFieldOptions): Maybe<TSourceProp>;

    override initialize(
        value: TSourceProp,
        model: ConstructorOf<DataModel>
    ): TNullable extends true ? TModelProp | null : TModelProp;

    protected override _validateType(data: object, options?: Record<string, unknown>): void;

    override toObject(value: TModelProp): TNullable extends true ? TSourceProp | null : TSourceProp;

    override apply(
        fn: string | ((field: this, value?: unknown, options?: Record<string, unknown>) => unknown),
        data?: object,
        options?: Record<string, unknown>
    ): TSourceProp;
}

export interface CleanFieldOptions {
    partial?: boolean;
    source?: object;
}

/* -------------------------------------------- */
/*  Basic Field Types                           */
/* -------------------------------------------- */

type BooleanFieldOptions<TSourceProp extends boolean, TNullable extends boolean> = Omit<
    DataFieldOptions<TSourceProp, TNullable>,
    "choices"
>;

/** A subclass of [DataField]{@link DataField} which deals with boolean-typed data. */
export class BooleanField<
    TSourceProp extends boolean = boolean,
    TModelProp = TSourceProp,
    TNullable extends boolean = false
> extends DataField<TSourceProp, TModelProp, TNullable> {
    protected static override get _defaults(): BooleanFieldOptions<boolean, boolean>;

    protected override _cast(value: unknown): TNullable extends true ? TSourceProp | null : TSourceProp;

    protected override _validateType(value: unknown): value is boolean;
}

/**
 * @typedef NumberFieldOptions
 * @property [min]            A minimum allowed value
 * @property [max]            A maximum allowed value
 * @property [step]           A permitted step size
 * @property [integer=false]  Must the number be an integer?
 * @property [positive=false] Must the number be positive?
 */
interface NumberFieldOptions<TSourceProp extends number = number, TNullable extends boolean = boolean>
    extends DataFieldOptions<TSourceProp, TNullable> {
    min?: number;
    max?: number;
    step?: number;
    integer?: boolean;
}

/** A subclass of [DataField]{@link DataField} which deals with number-typed data. */
export class NumberField<
        TSourceProp extends number = number,
        TModelProp = TSourceProp,
        TNullable extends boolean = true
    >
    extends DataField<TSourceProp, TModelProp, TNullable>
    implements NumberFieldOptions<TSourceProp, TNullable>
{
    /** @param options  Options which configure the behavior of the field */
    constructor(options?: NumberFieldOptions<TSourceProp>);

    protected static override get _defaults(): NumberFieldOptions;

    protected override _cast(value: unknown): TSourceProp;

    protected override _cleanType(value: unknown, options?: CleanFieldOptions): Maybe<TSourceProp>;

    protected override _validateType(value: unknown): void;
}

interface StringFieldOptions<TSourceProp extends string, TNullable extends boolean>
    extends DataFieldOptions<TSourceProp, TNullable> {
    choices?: readonly TSourceProp[] | Record<TSourceProp, string> | Function;
    /** [blank=true] Is the string allowed to be blank (empty)? */
    blank?: boolean;
    /** [trim=true]  Should any provided string be trimmed as part of cleaning? */
    trim?: boolean;
}

/** A subclass of `DataField` which deals with string-typed data. */
export class StringField<
        TSourceProp extends string = string,
        TModelProp = TSourceProp,
        TNullable extends boolean = false
    >
    extends DataField<TSourceProp, TModelProp, TNullable>
    implements StringFieldOptions<TSourceProp, TNullable>
{
    /** @param options Options which configure the behavior of the field */
    constructor(options?: StringFieldOptions<TSourceProp, TNullable>);

    protected static override get _defaults(): StringFieldOptions<string, boolean>;

    override clean(
        value: unknown,
        options?: CleanFieldOptions
    ): TNullable extends false ? TSourceProp : TSourceProp | null;

    protected override _cast(value: unknown): TSourceProp;

    protected override _validateSpecial(value: unknown): boolean | void;

    protected _validateType(value: unknown): boolean | void;
}

interface ObjectFieldOptions<TSourceProp extends object, TNullable extends boolean = false>
    extends DataFieldOptions<TSourceProp, TNullable> {
    initial: () => Record<string, never>;
}

/** A subclass of `DataField` which deals with object-typed data. */
export class ObjectField<TSourceProp extends object, TModelProp = TSourceProp, TNullable extends boolean = false>
    extends DataField<TSourceProp, TModelProp, TNullable>
    implements Omit<ObjectFieldOptions<TSourceProp, TNullable>, "initial">
{
    protected static override get _defaults(): ObjectFieldOptions<object, boolean>;

    protected override _cast(value: unknown): TSourceProp;

    override initialize(value: unknown): TModelProp;

    override toObject(value: TModelProp): TNullable extends true ? TSourceProp | null : TSourceProp;

    protected override _validateType(value: unknown): boolean | void;
}

export type FlagField<
    TSourceProp extends { [K in string]?: Record<string, unknown> } = { [K in string]?: Record<string, unknown> },
    TModelProp = TSourceProp,
    TNullable extends boolean = false
> = ObjectField<TSourceProp, TModelProp, TNullable>;

export type SourcePropFromDataField<TDataField extends DataField> = TDataField extends SchemaField<
    infer TSchemaSourceProp,
    infer _TSchemaModelProp,
    infer TSchemaNullable
>
    ? TSchemaNullable extends true
        ? SourceFromSchema<TSchemaSourceProp> | null
        : SourceFromSchema<TSchemaSourceProp>
    : TDataField extends DataField<infer TSourceProp, infer _TModelProp, infer TNullable>
    ? TNullable extends true
        ? TSourceProp | null
        : TSourceProp
    : never;

export type ModelPropFromDataField<TDataField extends DataField> = TDataField extends SchemaField<
    infer TSchemaSourceProp,
    infer _TSchemaModelProp,
    infer TSchemaNullable
>
    ? TSchemaNullable extends true
        ? ModelPropsFromSchema<TSchemaSourceProp> | null
        : ModelPropsFromSchema<TSchemaSourceProp>
    : ReturnType<TDataField["initialize"]>;

type ModelPropsFromSchema<TDataSchema extends DataSchema> = {
    [K in keyof TDataSchema]: ModelPropFromDataField<TDataSchema[K]>;
};

type ArrayFieldOptions<TElementField extends DataField, TNullable extends boolean> = DataFieldOptions<
    TElementField,
    TNullable
>;

/** A subclass of `DataField` which deals with array-typed data. */
export class ArrayField<
        TElementField extends DataField,
        TSourceProp extends SourcePropFromDataField<TElementField>[] = SourcePropFromDataField<TElementField>[],
        TModelProp extends object = TSourceProp,
        TNullable extends boolean = false
    >
    extends DataField<TSourceProp, TModelProp, TNullable>
    implements ArrayFieldOptions<TElementField, TNullable>
{
    /**
     * @param element A DataField instance which defines the type of element contained in the Array.
     * @param options Options which configure the behavior of the field
     */
    constructor(element: TElementField, options?: ArrayFieldOptions<TElementField, TNullable>);

    /** The data type of each element in this array */
    element: TElementField;

    /**
     * Validate the contained element type of the ArrayField
     * @param element The type of Array element
     * @returns The validated element type
     * @throws An error if the element is not a valid type
     */
    protected static _validateElementType(element: unknown): unknown;

    protected static override get _defaults(): ArrayFieldOptions<DataField, boolean>;

    protected override _cast(value: unknown): TSourceProp;

    protected _cleanType(value: Array<unknown> | Set<unknown>, options?: CleanFieldOptions): TSourceProp;

    protected override _validateType(value: unknown, options?: Record<string, unknown>): void;

    /**
     * Validate every element of the ArrayField
     * @param value   The array to validate
     * @param options Validation options
     * @returns An array of element-specific errors
     */
    protected _validateElements(value: unknown[], options?: Record<string, unknown>): ModelValidationError[];

    override initialize(
        value: TSourceProp,
        model: ConstructorOf<DataModel>,
        options: ArrayFieldOptions<TElementField, TNullable>
    ): TNullable extends true ? TModelProp | null : TModelProp;

    override toObject(value: TModelProp): TNullable extends true ? TSourceProp | null : TSourceProp;

    override apply(
        fn: string | ((field: this, value?: unknown, options?: Record<string, unknown>) => unknown),
        data?: object,
        options?: Record<string, unknown>
    ): TSourceProp;
}

export interface ArrayField<
    TElementField extends DataField,
    TSourceProp extends SourcePropFromDataField<TElementField>[] = SourcePropFromDataField<TElementField>[],
    TModelProp extends object = TSourceProp,
    TNullable extends boolean = false
> extends DataField<TSourceProp, TModelProp, TNullable> {
    clean(value: unknown, options?: CleanFieldOptions): TNullable extends false ? TSourceProp : TSourceProp | null;
}

/**
 * A subclass of `ArrayField` which supports a set of contained elements.
 * Elements in this set are treated as fungible and may be represented in any order or discarded if invalid.
 */
export class SetField<
    TElementField extends DataField,
    TSourceProp extends SourcePropFromDataField<TElementField>[] = SourcePropFromDataField<TElementField>[],
    TModelProp extends Set<SourcePropFromDataField<TElementField>> = Set<SourcePropFromDataField<TElementField>>,
    TNullable extends boolean = false
> extends ArrayField<TElementField, TSourceProp, TModelProp, TNullable> {
    protected override _validateElements(value: unknown[], options?: Record<string, unknown>): ModelValidationError[];

    override initialize(
        value: TSourceProp,
        model: ConstructorOf<DataModel>
    ): TNullable extends true ? TModelProp | null : TModelProp;

    override toObject(value: TModelProp): TNullable extends true ? TSourceProp | null : TSourceProp;
}

/** A subclass of `SchemaField` which embeds some other DataModel definition as an inner object. */
export class EmbeddedDataField<
    TSourceProp extends DataSchema = DataSchema,
    TModelProp extends DataModel<any> = DataModel<any>,
    TNullable extends boolean = false
> extends SchemaField<TSourceProp, TModelProp, TNullable> {
    /**
     * @param model   The class of DataModel which should be embedded in this field
     * @param options Options which configure the behavior of the field
     */
    constructor(model: TModelProp, options: ObjectFieldOptions<TSourceProp, TNullable>);

    /** The embedded DataModel definition which is contained in this field. */
    model: ConstructorOf<TModelProp>;

    protected override _initialize(fields: DataSchema): DataSchema;

    override initialize(
        value: TSourceProp,
        model: ConstructorOf<DataModel>
    ): TNullable extends true ? TModelProp | null : TModelProp;

    override toObject(value: TModelProp): TNullable extends true ? TSourceProp | null : TSourceProp;
}

/**
 * A subclass of `ArrayField` which supports an embedded Document collection.
 * Invalid elements will be dropped from the collection during validation rather than failing for the field entirely.
 */

export class EmbeddedCollectionField extends ArrayField<
    SchemaField,
    SourceFromSchema<DataSchema>[],
    EmbeddedCollection<DataModel<any>>
> {
    /**
     * @param element The type of Document which belongs to this embedded collection
     * @param options Options which configure the behavior of the field
     */
    constructor(element: ConstructorOf<Document>, options?: ArrayFieldOptions<SchemaField, false>);

    static override _validateElementType(element: unknown): Document;

    /** A reference to the DataModel subclass of the embedded document element */
    get model(): ConstructorOf<Document>;

    /** The DataSchema of the contained Document model. */
    get schema(): DataModel["schema"];

    protected override _cleanType(value: unknown, options?: CleanFieldOptions): SourcePropFromDataField<SchemaField>[];

    protected override _validateElements(value: unknown[], options?: Record<string, unknown>): ModelValidationError[];

    override initialize(_value: unknown, model: ConstructorOf<DataModel>): EmbeddedCollection<DataModel>;

    override toObject(value: EmbeddedCollection<DataModel>): SourcePropFromDataField<SchemaField>[];

    override apply(
        fn: string | ((field: this, value?: unknown, options?: Record<string, unknown>) => unknown),
        data?: object,
        options?: Record<string, unknown>
    ): SourcePropFromDataField<SchemaField>[];
}

/* -------------------------------------------- */
/*  Special Field Types                         */
/* -------------------------------------------- */

/**
 * A subclass of [StringField]{@link StringField} which provides the primary _id for a Document.
 * The field may be initially null, but it must be non-null when it is saved to the database.
 */
export class DocumentIdField<
    TModelProp extends string | DataModel = string,
    TNullable extends boolean = true
> extends StringField<string, TModelProp, TNullable> {
    protected static override get _defaults(): StringFieldOptions<string, boolean>;

    protected override _cast(value: unknown): string;

    protected override _validateType(value: unknown): boolean;
}

/**
 * A special class of [StringField]{@link StringField} field which references another DataModel by its id.
 * This field may also be null to indicate that no foreign model is linked.
 */
export class ForeignDocumentField<
    TModelProp extends string | DataModel = DataModel<any>,
    TNullable extends boolean = true
> extends DocumentIdField<TModelProp, TNullable> {
    /**
     * @param model   The foreign DataModel class definition which this field should link to.
     * @param options Options which configure the behavior of the field
     */
    constructor(model: ConstructorOf<DataModel>, options?: StringFieldOptions<string, TNullable>);

    /** A reference to the model class which is stored in this field */
    model: DataModel;

    protected static override get _defaults(): StringFieldOptions<string, boolean>;

    _cast(value: unknown): string;

    override initialize(
        value: string,
        model: ConstructorOf<DataModel>
    ): TNullable extends true ? TModelProp | null : TModelProp;

    toObject(value: TModelProp): TNullable extends true ? string | null : string;
}

/** A subclass of `ObjectField` which supports a system-level data object. */
export class SystemDataField<TSourceProp extends object = object, TModelProp = TSourceProp> extends ObjectField<
    TSourceProp,
    TModelProp
> {
    /**
     * @param document The base document class which belongs in this field
     * @param options  Options which configure the behavior of the field
     */
    constructor(document: ConstructorOf<DataModel>, options?: ObjectFieldOptions<TSourceProp>);

    /** The canonical document name of the document type which belongs in this field */
    document: ConstructorOf<DataModel>;

    protected static override get _defaults(): ObjectFieldOptions<object>;

    /** A convenience accessor for the name of the document type associated with this SystemDataField */
    get documentName(): string;

    /**
     * Get the DataModel definition that should be used for this type of document.
     * @param type The Document instance type
     * @returns The DataModel class, or null
     */
    getModelForType(type: string): ConstructorOf<DataModel> | null;

    getInitialValue(data: unknown): TSourceProp;

    protected override _cleanType(value: unknown, options?: CleanFieldOptions): TSourceProp;

    override initialize(value: string, model?: ConstructorOf<DataModel>): TModelProp;

    toObject(value: TModelProp): TSourceProp;
}

/** A special `StringField` which records a standardized CSS color string. */
export class ColorField<TNullable extends boolean = true> extends StringField<
    HexColorString,
    HexColorString,
    TNullable
> {
    protected static override get _defaults(): StringFieldOptions<HexColorString, boolean>;

    protected override _validateType(value: unknown): boolean;
}

/**
 * @typedef FilePathFieldOptions
 * @property [categories]   A set of categories in CONST.FILE_CATEGORIES which this field supports
 * @property [base64=false] Is embedded base64 data supported in lieu of a file path?
 */
interface FilePathFieldOptions<TSourceProp extends string = string, TNullable extends boolean = true>
    extends StringFieldOptions<TSourceProp, TNullable> {
    categories?: FileCategory[];
    base64?: boolean;
}

/** A special `StringField` which records a file path or inline base64 data. */
export class FilePathField<
    TSourceProp extends FilePath = FilePath,
    TModelProp = TSourceProp,
    TNullable extends boolean = true
> extends StringField<TSourceProp, TModelProp, TNullable> {
    /** @param options  Options which configure the behavior of the field */
    constructor(options?: FilePathFieldOptions);

    protected static override get _defaults(): FilePathFieldOptions;

    protected override _validateType(value: unknown): void;
}

/**
 * A special `NumberField` which represents an angle of rotation in degrees between 0 and 360.
 * @property base Whether the base angle should be treated as 360 or as 0
 */
export class AngleField<TNullable extends boolean = false> extends NumberField<number, number, TNullable> {
    protected static override get _defaults(): NumberFieldOptions & { base: 360 | 0 };

    protected override _cast(value: unknown): number;
}

/** A special `NumberField` represents a number between 0 and 1. */
export class AlphaField<TNullable extends boolean = false> extends NumberField<number, number, TNullable> {
    protected static get _defaults(): NumberFieldOptions;
}

/** A special `ObjectField` which captures a mapping of User IDs to Document permission levels. */
export class DocumentOwnershipField extends ObjectField<Record<string, DocumentOwnershipLevel>> {
    protected static override get _defaults(): ObjectFieldOptions<Record<string, DocumentOwnershipLevel>>;

    protected override _validateType(value: object): boolean | void;
}

/** A special [StringField]{@link StringField} which contains serialized JSON data. */
export class JSONField<TModelProp = object, TNullable extends boolean = false> extends StringField<
    string,
    TModelProp,
    TNullable
> {
    protected static override get _defaults(): StringFieldOptions<string, boolean>;

    override clean(value: unknown, options?: CleanFieldOptions): TNullable extends false ? string : string | null;

    protected override _validateType(value: unknown): boolean;

    override initialize(value: string): TNullable extends true ? TModelProp | null : TModelProp;

    toObject(value: TModelProp): TNullable extends true ? string | null : string;
}

/**
 * A subclass of [StringField]{@link StringField} which contains a sanitized HTML string.
 * This class does not override any StringField behaviors, but is used by the server-side to identify fields which
 * require sanitization of user input.
 */
export class HTMLField<
    TSourceProp extends string = string,
    TModelProp = TSourceProp,
    TNullable extends boolean = false
> extends StringField<TSourceProp, TModelProp, TNullable> {
    protected static override get _defaults(): StringFieldOptions<string, boolean>;
}

/** A subclass of `NumberField` which is used for storing integer sort keys. */
export class IntegerSortField<TNullable extends boolean = true> extends NumberField<number, number, TNullable> {
    protected static override get _defaults(): NumberFieldOptions;
}

/* ---------------------------------------- */

/** @typedef DocumentStats
 * @property systemId       The package name of the system the Document was created in.
 * @property systemVersion  The version of the system the Document was created in.
 * @property coreVersion    The core version the Document was created in.
 * @property createdTime    A timestamp of when the Document was created.
 * @property modifiedTime   A timestamp of when the Document was last modified.
 * @property lastModifiedBy The ID of the user who last modified the Document.
 */

/**
 * A subclass of {@link SchemaField} which stores document metadata in the _stats field.
 * @mixes DocumentStats
 */
export class DocumentStatsField extends SchemaField<DocumentStatsSchema> {
    constructor(options?: ObjectFieldOptions<DocumentStatsSchema>);
}

type DocumentStatsSchema = {
    systemId: StringField<string, string, true>;
    systemVersion: StringField<string, string, true>;
    coreVersion: StringField<string, string, true>;
    createdTime: NumberField;
    modifiedTime: NumberField;
    lastModifiedBy: ForeignDocumentField<string>;
};

/* ---------------------------------------- */
/*  Errors                                  */
/* ---------------------------------------- */

/**
 * A special type of error that wraps multiple errors which occurred during DataModel validation.
 * @param errors  An array or object containing several errors.
 */
export class ModelValidationError extends Error {
    constructor(errors: Error | Error[] | string);

    errors: Error | Error[] | string;

    /**
     * Collect all the errors into a single message for consumers who do not handle the ModelValidationError specially.
     * @param errors The raw error structure
     * @returns A formatted error message
     */
    static formatErrors(errors: Error | Error[] | string): string;
}

declare global {
    type SourceFromSchema<TDataSchema extends DataSchema> = {
        [K in keyof TDataSchema]: SourcePropFromDataField<TDataSchema[K]>;
    };

    type HexColorString = `#${string}`;
    type AudioFilePath = `${string}.${AudioFileExtension}`;
    type ImageFilePath = `${string}.${ImageFileExtension}`;
    type VideoFilePath = `${string}.${VideoFileExtension}` | ImageFilePath;
    type FilePath = AudioFilePath | ImageFilePath | VideoFilePath;
}
