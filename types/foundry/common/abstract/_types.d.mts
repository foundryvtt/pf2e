import { DocumentUUID } from "@client/utils/helpers.mjs";
import { DataField } from "@common/data/fields.mjs";
import { DataModel, Document } from "./_module.mjs";

export type DataSchema = { [K in string]: DataField<JSONValue, unknown> };

export interface DataModelValidationOptions {
    /** Validate each individual field */
    fields?: boolean;
    /**
     * Perform joint validation on the full data model?
     * Joint validation will be performed by default if no changes are passed.
     * Joint validation will be disabled by default if changes are passed.
     * Joint validation can be performed on a complete set of changes (for example
     * testing a complete data model) by explicitly passing true.
     */
    joint?: boolean;
    /** A specific set of proposed changes to validate, rather than the full source data of the model. */
    changes?: object;
    /**
     * If changes are provided, attempt to clean the changes before validating them? This option mutates the provided
     * changes.
     */
    clean?: boolean;
    /** Throw an error if validation fails. */
    strict?: boolean;
    /** Allow replacement of invalid values with valid defaults? This option mutates the provided changes. */
    fallback?: boolean;
    /**
     * If true, invalid embedded documents will emit a warning and be placed in the invalidDocuments collection rather
     * than causing the parent to be considered invalid. This option mutates the provided changes.
     */
    dropInvalidEmbedded?: boolean;
}

interface DataModelConstructionContext<TParent extends DataModel | null>
    extends Pick<DataModelValidationOptions, "strict" | "fallback" | "dropInvalidEmbedded"> {
    /** A parent DataModel instance to which this DataModel belongs */
    parent?: TParent;
    /** Allow partial source data, ignoring absent fields? */
    partial?: boolean;
}

export interface DataModelUpdateOptions {
    /** Do not finally apply the change, but instead simulate the update workflow */
    dryRun?: boolean;

    /** Allow automatic fallback to a valid initial value if the value provided for a field in the model is invalid. */
    fallback?: boolean;

    /** Apply changes to inner objects recursively rather than replacing the top-level object. */
    recursive?: boolean;

    /** An advanced option used specifically and internally by the ActorDelta model */
    restoreDelta?: boolean;
}

export interface DatabaseGetOperation<TParent extends Document | null> {
    action: "get";
    /** A query object which identifies the set of Documents retrieved */
    query: Record<string, unknown>;
    /** Get requests are never broadcast */
    broadcast?: false;
    /** Return indices only instead of full Document records */
    index?: boolean;
    /** An array of field identifiers which should be indexed */
    indexFields?: string;
    /** A compendium collection ID which contains the Documents */
    pack?: string | null;
    /** A parent Document within which Documents are embedded */
    parent?: TParent;
    /** A parent Document UUID provided when the parent instance is unavailable */
    parentUuid?: DocumentUUID;
}

export interface DatabaseCreateOperation<TParent extends Document | null> {
    action: "create";
    /** Whether the database operation is broadcast to other connected clients */
    broadcast: boolean;
    /** An array of data objects from which to create Documents */
    data: object[];
    /** Retain the _id values of provided data instead of generating new ids */
    keepId?: boolean;
    /** Retain the _id values of embedded document data instead of generating new ids for each embedded document */
    keepEmbeddedIds?: boolean;
    /** The timestamp when the operation was performed */
    modifiedTime?: number;
    /** Block the dispatch of hooks related to this operation */
    noHook?: boolean;
    /** Re-render Applications whose display depends on the created Documents */
    render?: boolean;
    /** Render the sheet Application for any created Documents */
    renderSheet?: boolean;
    /** A parent Document within which Documents are embedded */
    parent?: TParent;
    /** A compendium collection ID which contains the Documents */
    pack?: string | null;
    /** A parent Document UUID provided when the parent instance is unavailable */
    parentUuid?: DocumentUUID;
}

export interface DatabaseCreateCallbackOptions
    extends Omit<Partial<DatabaseCreateOperation<null>>, "action" | "data" | "pack" | "parent" | "noHook"> {}

export interface DatabaseUpdateOperation<TParent extends Document | null> {
    action: "update";
    /** Whether the database operation is broadcast to other connected clients */
    broadcast: boolean;
    /**
     * An array of data objects used to update existing Documents.
     * Each update object must contain the _id of the target Document
     */
    updates: object[];
    /**
     * Difference each update object against current Document data and only use differential data for the update
     * operation
     */
    diff?: boolean;
    /** The timestamp when the operation was performed */
    modifiedTime?: number;
    /** Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution! */
    recursive?: boolean;
    /** Re-render Applications whose display depends on the created Documents */
    render?: boolean;
    /** Block the dispatch of hooks related to this operation */
    noHook?: boolean;
    /** A parent Document within which Documents are embedded */
    parent?: TParent;
    /** A compendium collection ID which contains the Documents */
    pack?: string | null;
    /** A parent Document UUID provided when the parent instance is unavailable */
    parentUuid?: DocumentUUID;
}

export interface DatabaseUpdateCallbackOptions
    extends Omit<
        Partial<DatabaseUpdateOperation<null>>,
        "action" | "pack" | "parent" | "restoreDelta" | "noHook" | "updates"
    > {}

export interface DatabaseDeleteOperation<TParent extends Document | null> {
    action: "delete";
    /** Whether the database operation is broadcast to other connected clients */
    broadcast: boolean;
    /** An array of Document ids which should be deleted */
    ids: string[];
    /** Delete all documents in the Collection, regardless of _id */
    deleteAll?: boolean;
    /** The timestamp when the operation was performed */
    modifiedTime?: number;
    /** Block the dispatch of hooks related to this operation */
    noHook?: boolean;
    /** Re-render Applications whose display depends on the created Documents */
    render?: boolean;
    /** A parent Document within which Documents are embedded */
    parent?: TParent;
    /** A compendium collection ID which contains the Documents */
    pack?: string | null;
    /** A parent Document UUID provided when the parent instance is unavailable */
    parentUuid?: DocumentUUID;
}

export interface DatabaseDeleteCallbackOptions
    extends Omit<
        Partial<DatabaseDeleteOperation<null>>,
        "action" | "deleteAll" | "ids" | "pack" | "parent" | "noHook"
    > {}

export type DatabaseAction = "get" | "create" | "update" | "delete";

export type DatabaseOperation<TParent extends Document | null> =
    | DatabaseGetOperation<TParent>
    | DatabaseCreateOperation<TParent>
    | DatabaseUpdateOperation<TParent>
    | DatabaseDeleteOperation<TParent>;

export interface DocumentSocketRequest {
    /** The type of Document being transacted */
    type: string;
    /** The action of the request */
    action: DatabaseAction;
    /** Operation parameters for the request */
    operation: DatabaseOperation<Document | null>;
    /** The id of the requesting User */
    userId: string;
    /** Should the response be broadcast to other connected clients? */
    broadcast: boolean;
}
