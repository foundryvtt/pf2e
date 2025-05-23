import { DocumentConstructionContext } from "@common/_types.mjs";
import Collection, { CollectionGetOptions } from "../utils/collection.mjs";
import Document from "./document.mjs";

/** Used for the specific task of containing embedded Document instances within a parent Document. */
export default class EmbeddedCollection<TDocument extends Document<Document>> extends Collection<string, TDocument> {
    constructor(
        /** The name of this collection in the parent Document. */
        name: string,
        /** The parent DataModel instance to which this collection belongs. */
        parent: ConstructorOf<TDocument>,
        /** The source data array for the collection in the parent Document data. */
        sourceArray: PreCreate<TDocument["_source"]>[],
    );

    /** The Document implementation used to construct instances within this collection. */
    documentClass: ConstructorOf<TDocument>;

    /** The name of this collection in the parent Document. */
    name: string;

    /** The parent DataModel to which this EmbeddedCollection instance belongs. */
    model: TDocument["parent"];

    /** Has this embedded collection been initialized as a one-time workflow? */
    protected _initialized: boolean;

    /** The source data array from which the embedded collection is created */
    private _source: PreCreate<TDocument["_source"]>[];

    /** Record the set of document ids where the Document was not initialized because of invalid source data */
    invalidDocumentIds: Set<string>;

    /**
     * Instantiate a Document for inclusion in the Collection.
     * @param data    The Document data.
     * @param context Document creation context.
     */
    createDocument(
        data: PreCreate<TDocument["_source"]>,
        context?: DocumentConstructionContext<TDocument["parent"]>,
    ): TDocument;

    /**
     * Initialize the EmbeddedCollection object by constructing its contained Document instances
     * @param options Initialization options.
     * @param options.strict Whether to log an error or a warning when encountering invalid embedded documents.
     */
    initialize(options?: { strict?: boolean }): void;

    /**
     * Initialize an embedded document and store it in the collection.
     * @param data    The Document data.
     * @param options Options to configure Document initialization.
     * @param options.strict Whether to log an error or warning if the Document fails to initialize.
     */
    protected _initializeDocument(data: PreCreate<TDocument["_source"]>, options?: { strict?: boolean }): void;

    /**
     * Log warnings or errors when a Document is found to be invalid.
     * @param id             The invalid Document's ID.
     * @param err            The validation error.
     * @param options        Options to configure invalid Document handling.
     * @param options.strict Whether to throw an error or only log a warning.
     */
    protected _handleInvalidDocument(id: string, err: string, options?: { strict?: boolean }): void;

    /**
     * Get an element from the EmbeddedCollection by its ID.
     * @param id        The ID of the Embedded Document to retrieve.
     * @param [options] Additional options to configure retrieval.
     * @param [options.strict=false]  Throw an Error if the requested Embedded Document does not exist.
     * @param [options.invalid=false] Allow retrieving an invalid Embedded Document.
     * @throws If strict is true and the Embedded Document cannot be found.
     */
    override get<T extends TDocument = TDocument>(key: Maybe<string>, options: { strict: true; invalid?: boolean }): T;
    override get<T extends TDocument = TDocument>(key: string, options?: EmbeddedCollectionGetOptions): T | undefined;

    /**
     * Add an item to the collection.
     * @param {string} key                           The embedded Document ID.
     * @param {Document} value                       The embedded Document instance.
     * @param {object} [options]                     Additional options to the set operation.
     * @param {boolean} [options.modifySource=true]  Whether to modify the collection's source as part of the operation.
     */
    override set(key: string, value: TDocument, { modifySource }?: { modifySource?: boolean }): this;

    /**
     * Modify the underlying source array to include the Document.
     * @param key   The Document ID key.
     * @param value The Document.
     */
    protected _set(key: string, value: TDocument): void;

    /**
     * @param {string} key                           The embedded Document ID.
     * @param {object} [options]                     Additional options to the delete operation.
     * @param {boolean} [options.modifySource=true]  Whether to modify the collection's source as part of the operation.
     */
    override delete(key: string, { modifySource }?: { modifySource?: boolean }): boolean;

    /**
     * Remove the value from the underlying source array.
     * @param key       The Document ID key.
     * @param [options] Additional options to configure deletion behavior.
     */
    protected _delete(key: string, options?: object): void;

    /**
     * Update an EmbeddedCollection using an array of provided document data.
     * @param {DataModel[]} changes         An array of provided Document data
     * @param {object} [options={}]         Additional options which modify how the collection is updated
     */
    update(changes?: { _id: string; [key: string]: unknown }[], options?: DocumentSourceUpdateContext): void;

    /**
     * Create or update an embedded Document in this collection.
     * @param data         The update delta.
     * @param [options={}] Additional options which modify how the collection is updated.
     */
    protected _createOrUpdate(
        data: { _id: string; [key: string]: unknown },
        options?: DocumentSourceUpdateContext,
    ): void;

    /**
     * Obtain a temporary Document instance for a document id which currently has invalid source data.
     * @param id        A document ID with invalid source data.
     * @param [options] Additional options to configure retrieval.
     * @param [options.strict=true] Throw an Error if the requested ID is not in the set of invalid IDs for this
     *                              collection.
     * @returns An in-memory instance for the invalid Document
     * @throws If strict is true and the requested ID is not in the set of invalid IDs for this collection.
     */
    getInvalid(id: string, options?: { strict?: boolean }): TDocument | undefined;

    /**
     * Convert the EmbeddedCollection to an array of simple objects.
     * @param source Draw data for contained Documents from the underlying data source?
     * @returns The extracted array of primitive objects
     */
    toObject<T extends true>(source?: T): TDocument["_source"][];
}

interface EmbeddedCollectionGetOptions extends CollectionGetOptions {
    invalid?: boolean;
}
