import type * as fields from "../data/fields.d.ts";
import type { EmbeddedCollection } from "./embedded-collection.d.mts";
import type { Document } from "./module.d.ts";

/**
 * The abstract base class which defines the data schema contained within a Document.
 * @param [data={}]    Initial data used to construct the data object
 * @param [options={}] Options which affect DataModel construction
 */
export default abstract class DataModel<
    TParent extends DataModel | Document | null = _DataModel | null,
    TSchema extends fields.DataSchema = fields.DataSchema
> {
    constructor(
        data?: DeepPartial<SourceFromSchema<fields.DataSchema>>,
        options?: DataModelConstructionOptions<TParent>
    );

    /**
     * The source data object for this DataModel instance.
     * Once constructed, the source object is sealed such that no keys may be added nor removed.
     */
    readonly _source: SourceFromSchema<TSchema>;

    /** An immutable reverse-reference to a parent DataModel to which this model belongs. */
    readonly parent: TParent;

    /** The defined and cached Data Schema for all instances of this DataModel. */
    protected static _schema: fields.SchemaField<fields.DataSchema> | undefined;

    /** Configure the data model instance before validation and initialization workflows are performed. */
    protected _configure(): void;

    /* ---------------------------------------- */
    /*  Data Schema                             */
    /* ---------------------------------------- */

    /**
     * Define the data schema for documents of this type.
     * The schema is populated the first time it is accessed and cached for future reuse.
     */
    static defineSchema(): fields.DataSchema;

    /** Define the data schema for documents of this type. */
    static get schema(): fields.SchemaField<fields.DataSchema>;

    /** Define the data schema for this document instance. */
    // PROJECT NOTE: this must be overloaded in an interface merge declaration
    get schema(): fields.SchemaField<TSchema>;

    /** Is the current state of this DataModel invalid? */
    get invalid(): boolean;

    /* ---------------------------------------- */
    /*  Data Cleaning Methods                   */
    /* ---------------------------------------- */

    /**
     * Initialize the source data for a new DataModel instance.
     * One-time migrations and initial cleaning operations are applied to the source data.
     * @param data      The candidate source data from which the model will be constructed
     * @param [options] Options provided to the model constructor
     * @returns Migrated and cleaned source data which will be stored to the model instance
     */
    protected _initializeSource(data: object, options?: DataModelConstructionOptions<TParent>): this["_source"];

    /**
     * Clean a data source object to conform to a specific provided schema.
     * @param [source]     The source data object
     * @param [options={}] Additional options which are passed to field cleaning methods
     * @returns The cleaned source data
     */
    static cleanData(source?: object, options?: Record<string, unknown>): SourceFromSchema<fields.DataSchema>;

    /* ---------------------------------------- */
    /*  Data Initialization                     */
    /* ---------------------------------------- */

    /**
     * Initialize the instance by copying data from the source object to instance attributes.
     * This mirrors the workflow of SchemaField#initialize but with some added functionality.
     * @param [options] Options provided to the model constructor
     */
    protected _initialize(options?: Record<string, unknown>): void;

    /** Reset the state of this data instance back to mirror the contained source data, erasing any changes. */
    reset(): void;

    /* ---------------------------------------- */
    /*  Data Validation Methods                 */
    /* ---------------------------------------- */

    /**
     * Validate the data contained in the document to check for type and content
     * This function throws an error if data within the document is not valid
     *
     * @param options Optional parameters which customize how validation occurs.
     * @param [options.changes]        A specific set of proposed changes to validate, rather than the full
     *                                 source data of the model.
     * @param [options.clean=false]    If changes are provided, attempt to clean the changes before validating
     *                                 them?
     * @param [options.fallback=false] Allow replacement of invalid values with valid defaults?
     * @param [options.strict=true]    Throw if an invalid value is encountered, otherwise log a warning?
     * @param [options.fields=true]    Perform validation on individual fields?
     * @param [options.joint]          Perform joint validation on the full data model?
     *                                 Joint validation will be performed by default if no changes are passed.
     *                                 Joint validation will be disabled by default if changes are passed.
     *                                 Joint validation can be performed on a complete set of changes (for
     *                                 example testing a complete data model) by explicitly passing true.
     * @return An indicator for whether the document contains valid data
     */
    validate(options?: DataModelValidationOptions): boolean;

    /**
     * Get an array of validation errors from the provided error structure
     * @param errors
     * @param [options={}]
     * @param [options.label]     A prefix label that should prepend any error messages
     * @param [options.namespace] A field namespace that should prepend key names with dot-notation
     */
    static formatValidationErrors(
        errors: Record<string, string>,
        options?: { label?: string; namespace?: string }
    ): string;

    /**
     * Jointly validate the overall data model after each field has been individually validated.
     * @param data The candidate data object to validate
     * @throws An error if a validation failure is detected
     */
    static validateJoint(data: object): void;

    /* ---------------------------------------- */
    /*  Data Management                         */
    /* ---------------------------------------- */

    /**
     * Update the DataModel locally by applying an object of changes to its source data.
     * The provided changes are cleaned, validated, and stored to the source data object for this model.
     * The source data is then re-initialized to apply those changes to the prepared data.
     * The method returns an object of differential changes which modified the original data.
     *
     * @param changes      New values which should be applied to the data model
     * @param [options={}] Options which determine how the new data is merged
     * @returns An object containing the changed keys and values
     */
    updateSource(
        changes?: DeepPartial<this["_source"]> | undefined,
        options?: MergeObjectOptions
    ): DeepPartial<this["_source"]>;

    /* ---------------------------------------- */
    /*  Serialization and Storage               */
    /* ---------------------------------------- */

    /**
     * Copy and transform the DataModel into a plain object.
     * Draw the values of the extracted object from the data source (by default) otherwise from its transformed values.
     * @param [source=true] Draw values from the underlying data source rather than transformed values
     * @returns The extracted primitive object
     */
    toObject(source?: true): this["_source"];
    toObject(source: false): RawObject<this>;
    toObject(source?: boolean): this["_source"] | RawObject<this>;

    /**
     * Extract the source data for the DataModel into a simple object format that can be serialized.
     * @returns The document source data expressed as a plain object
     */
    toJSON(): this["_source"];

    /**
     * Create a new instance of this DataModel from a source record.
     * The source is presumed to be trustworthy and is not strictly validated.
     * @param source       Initial document data which comes from a trusted source.
     * @param [context]    Model construction context
     * @param [context.strict=false]  Models created from trusted source data are validated non-strictly
     */
    static fromSource(source: object, context?: { strict?: boolean; [key: string]: unknown }): DataModel;

    /**
     * Create a DataModel instance using a provided serialized JSON string.
     * @param json Serialized document data in string format
     * @returns A constructed data model instance
     */
    static fromJSON(json: string): DataModel;

    /* -------------------------------------------- */
    /*  Deprecations and Compatibility              */
    /* -------------------------------------------- */

    /**
     * Migrate candidate source data for this DataModel which may require initial cleaning or transformations.
     * @param source The candidate source data from which the model will be constructed
     * @returns Migrated source data, if necessary
     */
    static migrateData<TSource extends object>(source: TSource): TSource;

    /**
     * Wrap data migration in a try/catch which attempts it safely
     * @param source The candidate source data from which the model will be constructed
     * @returns Migrated source data, if necessary
     */
    static migrateDataSafe(source: object): object;
}

export type RawObject<TModel extends _DataModel> = {
    [P in keyof TModel]: TModel[P] extends EmbeddedCollection<infer U>
        ? RawObject<U>[]
        : TModel[P] extends DataModel
        ? RawObject<TModel[P]>
        : TModel[P] extends DataModel[]
        ? RawObject<TModel[P][number]>[]
        : TModel[P];
};

export interface DataModelValidationOptions {
    changes?: object;
    clean?: boolean;
    fallback?: boolean;
    strict?: boolean;
    fields?: boolean;
    joint?: boolean;
}

declare global {
    interface DataModelConstructionOptions<TParent extends DataModel | Document | null> {
        /** @param [parent=null] A parent DataModel instance to which this DataModel belongs */
        parent?: TParent;
        /** @param [strict=true] Control the strictness of validation for initially provided data */
        strict?: boolean;
        /** @param [fallback=false] Attempt to replace invalid values with valid defaults? */
        fallback?: boolean;
        /** @param [partial=false]  Allow partial source data, ignoring absent fields? */
        partial?: boolean;
        [key: string]: unknown;
    }
}

type _DataModel = DataModel<_DataModel | null, fields.DataSchema> | Document;
