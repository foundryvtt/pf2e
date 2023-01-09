import "../constants.mjs";
import "../../util";
import * as fields from "../data/fields.mjs";
import { BaseUser } from "../documents/user.mjs";
import { DatabaseBackend, DataModel, EmbeddedCollection } from "./module.mjs";

/** The abstract base interface for all Document types. */
export abstract class Document<
    TParent extends Document | null = _Document | null,
    TSchema extends fields.DataSchema = fields.DataSchema
> extends DataModel<TParent, TSchema> {
    /** An immutable reference to a containing Compendium collection to which this Document belongs. */
    readonly pack: string | null;

    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    /** Default metadata which applies to each instance of this Document type. */
    static readonly metadata: DocumentMetadata;

    /** The database backend used to execute operations and handle results */
    static get database(): DatabaseBackend;

    /** Return a reference to the configured subclass of this base Document type. */
    static get implementation(): typeof DataModel;

    /** The named collection to which this Document belongs. */
    static get collectionName(): string;
    get collectionName(): string;

    /** The canonical name of this Document type, for example "Actor". */
    static get documentName(): string;
    get documentName(): string;

    /** Does this Document definition include a SystemDataField? */
    static get hasSystemData(): boolean;

    /** The canonical identifier for this Document */
    get id(): string;

    /** Test whether this Document is embedded within a parent Document */
    get isEmbedded(): TParent extends null ? false : true;

    /* ---------------------------------------- */
    /*  Model Permissions                       */
    /* ---------------------------------------- */

    /**
     * Test whether a given User has a sufficient role in order to create Documents of this type.
     * @param user The User being tested
     * @return Does the User have a sufficient role to create?
     */
    static canUserCreate(user: BaseUser): boolean;

    /**
     * Get the permission level that a specific User has over this Document, a value in CONST.DOCUMENT_OWNERSHIP_LEVELS.
     * @param user The User being tested
     * @returns A numeric permission level from CONST.DOCUMENT_OWNERSHIP_LEVELS or null
     */
    getUserLevel(user: BaseUser): DocumentOwnershipLevel | null;

    /**
     * Test whether a certain User has a requested permission level (or greater) over the Document
     * @param user The User being tested
     * @param ownership The permission level from DOCUMENT_OWNERSHIP_LEVELS to test
     * @param options Additional options involved in the permission test
     * @param [options.exact=false] Require the exact permission level requested?
     * @return Does the user have this permission level over the Document?
     */
    testUserPermission(
        user: BaseUser,
        ownership: DocumentOwnershipString | DocumentOwnershipLevel,
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

    /* ---------------------------------------- */
    /*  Model Methods                           */
    /* ---------------------------------------- */

    /**
     * Clone a document, creating a new document by combining current data with provided overrides.
     * The cloned document is ephemeral and not yet saved to the database.
     * @param [data={}]                Additional data which overrides current document data at the time of creation
     * @param [options={}]             Additional options which customize the creation workflow
     * @param [options.save=false]    Save the clone to the World database?
     * @param [options.keepId=false]  Keep the original Document ID? Otherwise the ID will become undefined
     * @returns The cloned Document instance
     */
    clone<T extends this>(
        data: DocumentUpdateData<this> | undefined,
        options: { save: true; keepId?: boolean }
    ): Promise<T>;
    clone<T extends this>(data?: DocumentUpdateData<this>, options?: { save?: false; keepId?: boolean }): T;
    clone<T extends this>(
        data?: DocumentUpdateData<this>,
        options?: { save?: boolean; keepId?: boolean }
    ): T | Promise<T>;

    /**
     * For Documents which include game system data, migrate the system data object to conform to its latest data model.
     * The data model is defined by the template.json specification included by the game system.
     * @returns The migrated system data object
     */
    migrateSystemData<T extends { _source: { system: object } }>(this: T): T["_source"]["system"];

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
    static createDocuments<T extends Document>(
        this: ConstructorOf<T>,
        data?: PreCreate<T["_source"]>[],
        context?: DocumentModificationContext<ParentOf<T>>
    ): Promise<T[]>;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static updateDocuments<T extends Document>(
        this: ConstructorOf<T>,
        updates?: DocumentUpdateData<T>[],
        context?: DocumentModificationContext<ParentOf<T>>
    ): Promise<T[]>;

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
    static deleteDocuments<T extends Document>(
        this: ConstructorOf<T>,
        ids?: string[],
        context?: DocumentModificationContext<ParentOf<T>>
    ): Promise<T[]>;

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
    static create<T extends Document>(
        this: ConstructorOf<T>,
        data: PreCreate<T["_source"]>,
        context?: DocumentModificationContext<ParentOf<T>>
    ): Promise<T | undefined>;
    static create<T extends Document>(
        this: ConstructorOf<T>,
        data: PreCreate<T["_source"]>[],
        context?: DocumentModificationContext<ParentOf<T>>
    ): Promise<T[]>;
    static create<T extends Document>(
        this: ConstructorOf<T>,
        data: PreCreate<T["_source"]> | PreCreate<T["_source"]>[],
        context?: DocumentModificationContext<ParentOf<T>>
    ): Promise<T[] | T | undefined>;

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

    /**
     * Get a World-level Document of this type by its id.
     * @param documentId The Document ID
     * @returns The retrieved Document, or null
     */
    static get<T extends Document>(this: ConstructorOf<T>, documentId: string): T | null;

    /* -------------------------------------------- */
    /*  Embedded Operations                         */
    /* -------------------------------------------- */

    /**
     * Obtain a reference to the Array of source data within the data object for a certain embedded Document name
     * @param embeddedName The name of the embedded Document type
     * @return The Collection instance of embedded Documents of the requested type
     */
    getEmbeddedCollection(embeddedName: string): EmbeddedCollection<Document<this, any>>;

    /**
     * Get an embedded document by it's id from a named collection in the parent document.
     * @param embeddedName The name of the embedded Document type
     * @param id The id of the child document to retrieve
     * @param [options] Additional options which modify how embedded documents are retrieved
     * @param [options.strict=false] Throw an Error if the requested id does not exist. See Collection#get
     * @return The retrieved embedded Document instance, or undefined
     */
    getEmbeddedDocument(embeddedName: string, id: string, { strict }: { strict: true }): Document<this, any>;
    getEmbeddedDocument(
        embeddedName: string,
        id: string,
        { strict }: { strict: false }
    ): Document<this, any> | undefined;
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
     * Update multiple embedded Document instances within a parent Document using provided differential data.
     * @param embeddedName The name of the embedded Document type
     * @param updates      An array of differential data objects, each used to update a single Document
     * @param [context={}] Additional context which customizes the update workflow
     * @return An array of updated Document instances
     */
    updateEmbeddedDocuments(
        embeddedName: string,
        updates: EmbeddedDocumentUpdateData<Document>[],
        context?: DocumentModificationContext<this>
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
        ids: string[],
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
}

type MetadataPermission =
    | keyof typeof CONST.USER_ROLES
    | keyof typeof CONST.USER_PERMISSIONS
    | ((...args: any[]) => boolean);

export interface DocumentMetadata {
    name: string;
    collection?: string;
    indexed: boolean;
    compendiumIndexFields: string[];
    label: string;
    coreTypes: string[];
    embedded: Record<string, string>;
    permissions: {
        create: MetadataPermission;
        update: MetadataPermission;
        delete: MetadataPermission;
    };
    preserveOnImport: string[];
}

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
}

type _Document = Document<any>;
