import type * as CONST from "../constants.d.ts";
import type { DataSchema, SchemaField } from "../data/fields.d.ts";
import type BaseUser from "../documents/user.d.ts";
import type { DataModelValidationOptions } from "./data.d.ts";
import type EmbeddedCollection from "./embedded-collection.d.ts";

/** The abstract base interface for all Document types. */
export default abstract class Document<
    TParent extends Document | null = _Document | null,
    TSchema extends DataSchema = DataSchema
> {
    constructor(data: object, context?: DocumentConstructionContext<Document | null>);

    _id: string | null;

    /** An immutable reverse-reference to the parent Document to which this embedded Document belongs. */
    readonly parent: TParent;

    /** An immutable reference to a containing Compendium collection to which this Document belongs. */
    readonly pack: string | null;

    _source: object;
    get schema(): SchemaField<TSchema>;

    // actually in `DataModel`
    static defineSchema(): DataSchema;

    /** Perform one-time initialization tasks which only occur when the Document is first constructed. */
    protected _initialize(): void;

    /**
     * Initialize the source data for a new DataModel instance.
     * One-time migrations and initial cleaning operations are applied to the source data.
     * @param data      The candidate source data from which the model will be constructed
     * @param [options] Options provided to the model constructor
     * @returns Migrated and cleaned source data which will be stored to the model instance
     * System note: actually in `DataModel`
     */
    protected _initializeSource(
        data: Record<string, unknown>,
        options?: DocumentConstructionContext<TParent>
    ): this["_source"];

    /**
     * Reset the state of this data instance back to mirror the contained source data, erasing any changes.
     */
    reset(): void;

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

    /* -------------------------------------------- */
    /*  Configuration                               */
    /* -------------------------------------------- */

    /** Default metadata which applies to each instance of this Document type. */
    static get metadata(): DocumentMetadata;

    /**
     * The database backend used to execute operations and handle results
     * @type {DatabaseBackend}
     */
    static get database(): object;

    /** Return a reference to the implemented subclass of this base document type. */
    static get implementation(): typeof Document;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** The named collection to which this Document belongs. */
    static get collectionName(): string;

    /** The canonical name of this Document type, for example "Actor". */
    get documentName(): string;

    /** The canonical name of this Document type, for example "Actor". */
    static get documentName(): string;

    /** The canonical identifier for this Document */
    get id(): string;

    /** Test whether this Document is embedded within a parent Document */
    get isEmbedded(): boolean;

    /* ---------------------------------------- */
    /*  Methods                                 */
    /* ---------------------------------------- */

    /**
     * Test whether a given User has a sufficient role in order to create Documents of this type.
     * @param user The User being tested
     * @return Does the User have a sufficient role to create?
     */
    static canUserCreate(user: BaseUser): boolean;

    /**
     * Get the explicit permission level that a User has over this Document, a value in CONST.DOCUMENT_OWNERSHIP_LEVELS.
     * This method returns the value recorded in Document ownership, regardless of the User's role.
     * To test whether a user has a certain capability over the document, testUserPermission should be used.
     * @param user The User being tested
     * @returns A numeric permission level from CONST.DOCUMENT_OWNERSHIP_LEVELS or null
     */
    getUserLevel(user: BaseUser): DocumentOwnershipLevel | null;

    /**
     * Migrate candidate source data for this DataModel which may require initial cleaning or transformations.
     * @param source           The candidate source data from which the model will be constructed
     * @returns                Migrated source data, if necessary
     */
    static migrateData<TSource extends object>(source: TSource): TSource;

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
    updateSource(data?: DocumentUpdateData, options?: DocumentSourceUpdateContext): DeepPartial<this["_source"]>;

    /**
     * Clone a document, creating a new document by combining current data with provided overrides.
     * The cloned document is ephemeral and not yet saved to the database.
     * @param [data={}]                Additional data which overrides current document data at the time of creation
     * @param [options={}]             Additional options which customize the creation workflow
     * @param [options.save=false]    Save the clone to the World database?
     * @param [options.keepId=false]  Keep the original Document ID? Otherwise the ID will become undefined
     * @returns The cloned Document instance
     */
    clone(data: DocumentUpdateData<this> | undefined, options: DocumentCloneOptions & { save: true }): Promise<this>;
    clone(data?: DocumentUpdateData<this>, options?: DocumentCloneOptions & { save?: false }): this;
    clone(data?: DocumentUpdateData<this>, options?: DocumentCloneOptions): this | Promise<this>;

    /**
     * Test whether a certain User has a requested permission level (or greater) over the Document
     * @param user The User being tested
     * @param permission The permission level from DOCUMENT_PERMISSION_LEVELS to test
     * @param options Additional options involved in the permission test
     * @param [options.exact=false] Require the exact permission level requested?
     * @return Does the user have this permission level over the Document?
     */
    testUserPermission(
        user: BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean }
    ): boolean;

    /**
     * Test whether a given User has permission to perform some action on this Document
     * @param user   The User attempting modification
     * @param action The attempted action
     * @param [data] Data involved in the attempted action
     * @return Does the User have permission?
     */
    canUserModify(user: BaseUser, action: UserAction, data?: Record<string, unknown>): boolean;

    /* -------------------------------------------- */
    /*  Database Operations                         */
    /* -------------------------------------------- */

    /**
     * Create multiple Documents using provided input data.
     * Data is provided as an array of objects where each individual object becomes one new Document.
     *
     * @param data An array of data objects used to create multiple documents
     * @param [context={}] Additional context which customizes the creation workflow
     * @return An array of created Document instances
     *
     * @example <caption>Create a single Document</caption>
     * const data = [{name: "New Actor", type: "character", img: "path/to/profile.jpg"}];
     * const created = await Actor.createDocuments(data);
     *
     * @example <caption>Create multiple Documents</caption>
     * const data = [{name: "Tim", type: "npc"], [{name: "Tom", type: "npc"}];
     * const created = await Actor.createDocuments(data);
     *
     * @example <caption>Create multiple embedded Documents within a parent</caption>
     * const actor = game.actors.getName("Tim");
     * const data = [{name: "Sword", type: "weapon"}, {name: "Breastplate", type: "equipment"}];
     * const created = await Item.createDocuments(data, {parent: actor});
     *
     * @example <caption>Create a Document within a Compendium pack</caption>
     * const data = [{name: "Compendium Actor", type: "character", img: "path/to/profile.jpg"}];
     * const created = await Actor.createDocuments(data, {pack: "mymodule.mypack"});
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static createDocuments<TDocument extends Document<any>>(
        this: ConstructorOf<TDocument>,
        data?: (TDocument | PreCreate<TDocument["_source"]>)[],
        context?: DocumentModificationContext<TDocument["parent"]>
    ): Promise<TDocument[]>;

    /**
     * Update multiple Document instances using provided differential data.
     * Data is provided as an array of objects where each individual object updates one existing Document.
     *
     * @param updates An array of differential data objects, each used to update a single Document
     * @param [context={}] Additional context which customizes the update workflow
     * @return An array of updated Document instances
     *
     * @example <caption>Update a single Document</caption>
     * const updates = [{_id: "12ekjf43kj2312ds", name: "Timothy"}];
     * const updated = await Actor.updateDocuments(updates);
     *
     * @example <caption>Update multiple Documents</caption>
     * const updates = [{_id: "12ekjf43kj2312ds", name: "Timothy"}, {_id: "kj549dk48k34jk34", name: "Thomas"}]};
     * const updated = await Actor.updateDocuments(updates);
     *
     * @example <caption>Update multiple embedded Documents within a parent</caption>
     * const actor = game.actors.getName("Timothy");
     * const updates = [{_id: sword.id, name: "Magic Sword"}, {_id: shield.id, name: "Magic Shield"}];
     * const updated = await Item.updateDocuments(updates, {parent: actor});
     *
     * @example <caption>Update Documents within a Compendium pack</caption>
     * const actor = await pack.getDocument(documentId);
     * const updated = await Actor.updateDocuments([{_id: actor.id, name: "New Name"}], {pack: "mymodule.mypack"});
     */
    static updateDocuments<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        updates?: DocumentUpdateData<TDocument>[],
        context?: DocumentModificationContext<TDocument["parent"]>
    ): Promise<TDocument[]>;

    /**
     * Delete one or multiple existing Documents using an array of provided ids.
     * Data is provided as an array of string ids for the documents to delete.
     *
     * @param ids           An array of string ids for the documents to be deleted
     * @param [context={}] Additional context which customizes the deletion workflow
     * @return An array of deleted Document instances
     *
     * @example <caption>Delete a single Document</caption>
     * const tim = game.actors.getName("Tim");
     * const deleted = await Actor.deleteDocuments([tim.id]);
     *
     * @example <caption>Delete multiple Documents</caption>
     * const tim = game.actors.getName("Tim");
     * const tom = game.actors.getName("Tom");
     * const deleted = await Actor.deleteDocuments([tim.id, tom.id]);
     *
     * @example <caption>Delete multiple embedded Documents within a parent</caption>
     * const tim = game.actors.getName("Tim");
     * const sword = tim.items.getName("Sword");
     * const shield = tim.items.getName("Shield");
     * const deleted = await Item.deleteDocuments([sword.id, shield.id], parent: actor});
     *
     * @example <caption>Delete Documents within a Compendium pack</caption>
     * const actor = await pack.getDocument(documentId);
     * const deleted = await Actor.deleteDocuments([actor.id], {pack: "mymodule.mypack"});
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static deleteDocuments<TDocument extends Document<any>>(
        this: ConstructorOf<TDocument>,
        ids?: string[],
        context?: DocumentModificationContext<TDocument["parent"]>
    ): Promise<TDocument[]>;

    /**
     * Create a new Document using provided input data, saving it to the database.
     * @see {@link Document.createDocuments}
     * @param [data={}]    Initial data used to create this Document
     * @param [context={}] Additional context which customizes the creation workflow
     * @return The created Document instance
     *
     * @example <caption>Create a World-level Item</caption>
     * const data = [{name: "Special Sword", type: "weapon"}];
     * const created = await Item.create(data);
     *
     * @example <caption>Create an Actor-owned Item</caption>
     * const data = [{name: "Special Sword", type: "weapon"}];
     * const actor = game.actors.getName("My Hero");
     * const created = await Item.create(data, {parent: actor});
     *
     * @example <caption>Create an Item in a Compendium pack</caption>
     * const data = [{name: "Special Sword", type: "weapon"}];
     * const created = await Item.create(data, {pack: "mymodule.mypack"});
     */
    static create<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        data: PreCreate<TDocument["_source"]>,
        context?: DocumentModificationContext<TDocument["parent"]>
    ): Promise<TDocument | undefined>;
    static create<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        data: PreCreate<TDocument["_source"]>[],
        context?: DocumentModificationContext<TDocument["parent"]>
    ): Promise<TDocument[]>;
    static create<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        data: PreCreate<TDocument["_source"]> | PreCreate<TDocument["_source"]>[],
        context?: DocumentModificationContext<TDocument["parent"]>
    ): Promise<TDocument[] | TDocument | undefined>;

    /**
     * Update one or multiple existing entities using provided input data.
     * Data may be provided as a single object to update one Document, or as an Array of Objects.
     * @static
     *
     * @param data              A Data object or array of Data. Each element must contain the _id of an existing Document.
     * @param options           Additional options which customize the update workflow
     * @param [options.diff]    Difference the provided data against the current to eliminate unnecessary changes.
     * @param [options.noHook]  Block the dispatch of preUpdate hooks for this operation.
     *
     * @return  The updated Document or array of Entities
     *
     * @example
     * const data = {_id: "12ekjf43kj2312ds", name: "New Name"}};
     * const updated = await Document.update(data); // Updated entity saved to the database
     *
     * @example
     * const data = [{_id: "12ekjf43kj2312ds", name: "New Name 1"}, {_id: "kj549dk48k34jk34", name: "New Name 2"}]};
     * const updated = await Document.update(data); // Returns an Array of Entities, updated in the database
     */
    update(data: DocumentUpdateData<this>, options?: DocumentModificationContext<TParent>): Promise<this>;

    /**
                 * Delete the current Document.
                 * @see {Document.delete}

                 * @param context Options which customize the deletion workflow
                 * @return The deleted Document
                 */
    delete(context?: DocumentModificationContext<TParent>): Promise<this>;

    /* -------------------------------------------- */
    /*  Embedded Operations                         */
    /* -------------------------------------------- */

    /**
     * Obtain a reference to the Array of source data within the data object for a certain embedded Document name
     * @param embeddedName The name of the embedded Document type
     * @return The Collection instance of embedded Documents of the requested type
     */
    getEmbeddedCollection(embeddedName: string): EmbeddedCollection<Document<Document>>;

    /**
     * Get an embedded document by it's id from a named collection in the parent document.
     * @param embeddedName The name of the embedded Document type
     * @param id The id of the child document to retrieve
     * @param [options] Additional options which modify how embedded documents are retrieved
     * @param [options.strict=false] Throw an Error if the requested id does not exist. See Collection#get
     * @return The retrieved embedded Document instance, or undefined
     */
    getEmbeddedDocument(embeddedName: string, id: string, { strict }: { strict: true }): Document;
    getEmbeddedDocument(embeddedName: string, id: string, { strict }: { strict: false }): Document | undefined;
    getEmbeddedDocument(embeddedName: string, id: string, { strict }?: { strict?: boolean }): Document | undefined;

    /**
     * Create multiple embedded Document instances within this parent Document using provided input data.
     * @see {@link Document.createDocuments}
     * @param embeddedName The name of the embedded Document type
     * @param data An array of data objects used to create multiple documents
     * @param [context={}] Additional context which customizes the creation workflow
     * @return An array of created Document instances
     */
    createEmbeddedDocuments(
        embeddedName: string,
        data: PreCreate<object>[],
        context?: DocumentModificationContext<this>
    ): Promise<Document[]>;

    /**
                 * Update one or multiple existing entities using provided input data.
                 * Data may be provided as a single object to update one Document, or as an Array of Objects.
                 /**
                 * Update multiple embedded Document instances within a parent Document using provided differential data.
                 * @see {@link Document.updateDocuments}
                 * @param embeddedName               The name of the embedded Document type
                 * @param updates An array of differential data objects, each used to update a single Document
                 * @param [context={}] Additional context which customizes the update workflow
                 * @return An array of updated Document instances
                 */
    updateEmbeddedDocuments(
        embeddedName: string,
        updateData: EmbeddedDocumentUpdateData<Document>[],
        context?: DocumentUpdateContext<this>
    ): Promise<Document[]>;

    /**
     * Delete multiple embedded Document instances within a parent Document using provided string ids.
     * @see {@link Document.deleteDocuments}
     * @param embeddedName               The name of the embedded Document type
     * @param ids                      An array of string ids for each Document to be deleted
     * @param [context={}] Additional context which customizes the deletion workflow
     * @return An array of deleted Document instances
     */
    deleteEmbeddedDocuments(
        embeddedName: string,
        dataId: string[],
        context?: DocumentModificationContext<this>
    ): Promise<Document[]>;

    /* -------------------------------------------- */
    /*  Flag Operations                             */
    /* -------------------------------------------- */

    /**
     * Get the value of a "flag" for this document
     * See the setFlag method for more details on flags
     *
     * @param scope The flag scope which namespaces the key
     * @param key   The flag key
     * @return The flag value
     */
    getFlag(scope: string, key: string): unknown;

    /**
     * Assign a "flag" to this document.
     * Flags represent key-value type data which can be used to store flexible or arbitrary data required by either
     * the core software, game systems, or user-created modules.
     *
     * Each flag should be set using a scope which provides a namespace for the flag to help prevent collisions.
     *
     * Flags set by the core software use the "core" scope.
     * Flags set by game systems or modules should use the canonical name attribute for the module
     * Flags set by an individual world should "world" as the scope.
     *
     * Flag values can assume almost any data type. Setting a flag value to null will delete that flag.
     *
     * @param scope The flag scope which namespaces the key
     * @param key The flag key
     * @param value The flag value
     * @return A Promise resolving to the updated document
     */
    setFlag(scope: string, key: string, value: unknown): Promise<this>;

    /**
     * Remove a flag assigned to the Document
     * @param scope The flag scope which namespaces the key
     * @param key   The flag key
     * @return A Promise resolving to the updated Document
     */
    unsetFlag(scope: string, key: string): Promise<this>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * Perform preliminary operations before a Document of this type is created.
     * Pre-creation operations only occur for the client which requested the operation.
     * @param data    The initial data object provided to the document creation request
     * @param options Additional options which modify the creation request
     * @param user    The User requesting the document creation
     */
    protected _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: BaseUser
    ): Promise<void>;

    /**
     * Perform preliminary operations before a Document of this type is updated.
     * Pre-update operations only occur for the client which requested the operation.
     * @param changed The differential data that is changed relative to the documents prior values
     * @param options Additional options which modify the update request
     * @param user    The User requesting the document update
     */
    protected _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        user: BaseUser
    ): Promise<void>;

    /**
     * Perform preliminary operations before a Document of this type is deleted.
     * Pre-delete operations only occur for the client which requested the operation.
     * @param options Additional options which modify the deletion request
     * @param user    The User requesting the document deletion
     */
    protected _preDelete(options: DocumentModificationContext<TParent>, user: BaseUser): Promise<void>;

    /**
     * Perform follow-up operations after a Document of this type is created.
     * Post-creation operations occur for all clients after the creation is broadcast.
     * @param data    The initial data object provided to the document creation request
     * @param options Additional options which modify the creation request
     */
    protected _onCreate(data: this["_source"], options: DocumentModificationContext<TParent>, userId: string): void;

    /**
     * Perform follow-up operations after a Document of this type is updated.
     * Post-update operations occur for all clients after the update is broadcast.
     * @param changed The differential data that was changed relative to the documents prior values
     * @param options Additional options which modify the update request
     * @param userId  The ID of the User requesting the document update
     */
    protected _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        userId: string
    ): void;

    /**
     * Perform follow-up operations after a Document of this type is deleted.
     * Post-deletion operations occur for all clients after the deletion is broadcast.
     * @param options Additional options which modify the deletion request
     * @param userId The ID of the User requesting the document deletion
     */
    protected _onDelete(options: DocumentModificationContext<TParent>, userId: string): void;

    /**
     * Perform follow-up operations when a set of Documents of this type are created.
     * This is where side effects of creation should be implemented.
     * Post-creation side effects are performed only for the client which requested the operation.
     * @param documents The Document instances which were created
     * @param context   The context for the modification operation
     */
    protected static _onCreateDocuments(
        documents: Document[],
        context: DocumentModificationContext<Document | null>
    ): void;

    /**
     * Perform follow-up operations when a set of Documents of this type are updated.
     * This is where side effects of updates should be implemented.
     * Post-update side effects are performed only for the client which requested the operation.
     * @param documents The Document instances which were updated
     * @param context   The context for the modification operation
     */
    protected static _onUpdateDocuments(
        documents: Document[],
        context: DocumentModificationContext<Document | null>
    ): void;

    /**
     * Perform follow-up operations when a set of Documents of this type are deleted.
     * This is where side effects of deletion should be implemented.
     * Post-deletion side effects are performed only for the client which requested the operation.
     * @param documents The Document instances which were deleted
     * @param context   The context for the modification operation
     */
    protected static _onDeleteDocuments(
        documents: Document[],
        context: DocumentModificationContext<Document | null>
    ): void;

    /* ---------------------------------------- */
    /*  Serialization and Storage               */
    /* ---------------------------------------- */

    /**
     * Transform the Document instance into a plain object.
     * The created object is an independent copy of the original data.
     * See DocumentData#toObject
     * @param [source=true] Draw values from the underlying data source rather than transformed values
     * @returns The extracted primitive object
     */
    toObject(source?: true): this["_source"];
    toObject(source: false): RawObject<this>;
    toObject(source?: boolean): this["_source"] | RawObject<this>;

    /**
     * Serializing an Document should simply serialize its inner data, not the entire instance
     */
    toJSON(): RawObject<this>;
}

type MetadataPermission =
    | keyof typeof CONST.USER_ROLES
    | keyof typeof CONST.USER_PERMISSIONS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((...args: any[]) => boolean);

export interface DocumentMetadata {
    collection: string;
    embedded: Record<string, string>;
    hasSystemData: boolean;
    isEmbedded?: boolean;
    isPrimary?: boolean;
    name: string;
    pack: null;
    permissions: {
        create: MetadataPermission;
        update: MetadataPermission;
        delete: MetadataPermission;
    };
    types: string[] | Record<string, number>;
}

type _Document = Document<_Document | null>;

declare global {
    type PreCreate<T extends object> = T extends { name: string; type: string }
        ? Omit<DeepPartial<T>, "name" | "type"> & { name: string; type: T["type"] }
        : DeepPartial<T>;

    type PreDocumentId<T extends object> = Omit<T, "_id"> & { _id: null };

    type DocumentUpdateData<T extends Document = Document> = Partial<T["_source"]> | Record<string, unknown>;

    type EmbeddedDocumentUpdateData<T extends Document> = DocumentUpdateData<T> & { _id: string };

    interface DocumentRenderOptions extends RenderOptions {
        data?: {
            permission?: boolean;
        };
    }

    type DocumentFlags = Record<string, Record<string, unknown> | undefined>;

    type RawObject<T extends Document> = {
        [P in keyof T["_source"]]: T[P] extends EmbeddedCollection<infer U>
            ? RawObject<U>[]
            : T[P] extends Document
            ? RawObject<T[P]>
            : T[P] extends Document[]
            ? RawObject<T[P][number]>[]
            : T[P];
    };

    interface DocumentCloneOptions extends Omit<DocumentConstructionContext<null>, "parent"> {
        save?: boolean;
        keepId?: boolean;
    }

    interface DocumentSourceUpdateContext extends Omit<DocumentModificationContext<null>, "parent"> {
        dryRun?: boolean;
        fallback?: boolean;
    }
}
