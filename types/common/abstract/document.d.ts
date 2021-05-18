declare function fromUuid(uuid: string): Promise<CompendiumDocument | null>;

declare module foundry {
    module abstract {
        type DocumentConstructorData<T extends DocumentData> = T | ReturnType<T['toObject']>;

        interface DocumentConstructorContext<T extends Document | null = Document | null> {
            parent?: T;
            compendium?: CompendiumCollection | null;
            [key: string]: unknown;
        }

        /** The abstract base interface for all Document types. */
        abstract class Document {
            constructor(data: DocumentConstructorData<DocumentData>, context?: DocumentConstructorContext);

            /**
             * An immutable reverse-reference to the parent Document to which this embedded Document belongs.
             * @name abstract.Document#parent
             */
            readonly parent: Document | null;

            /**
             * An immutable reference to a containing Compendium collection to which this Document belongs.
             * @name abstract.Document#pack
             */
            readonly pack: string | null;

            /**
             * The base data object for this Document which persists both the original source and any derived data.
             * @name abstract.Document#data
             */
            readonly data: DocumentData;

            /**
             * A collection of Application instances which should be re-rendered whenever this Document experiences an update to
             * its data. The keys of this object are the application ids and the values are Application instances. Each
             * Application in this object will have its render method called by {@link Document#render}.
             */
            apps: Record<number, Application>;

            /** Perform one-time initialization tasks which only occur when the Document is first constructed. */
            protected _initialize(): void;

            /* -------------------------------------------- */
            /*  Configuration                               */
            /* -------------------------------------------- */

            /**
             * Every document must define an object which represents its data schema.
             * This must be a subclass of the DocumentData interface.
             */
            static get schema(): new (...args: any[]) => DocumentData;

            /** Default metadata which applies to each instance of this Document type. */
            static get metadata(): DocumentMetadata;

            /**
             * The database backend used to execute operations and handle results
             * @type {DatabaseBackend}
             */
            static get database(): object;

            /** Return a reference to the implemented subclass of this base document type. */
            static get implementation(): typeof foundry.abstract.Document;

            /* -------------------------------------------- */
            /*  Properties                                  */
            /* -------------------------------------------- */

            /** The named collection to which this Document belongs. */
            static get collectionName(): string;

            /** The canonical name of this Document type, for example "Actor". */
            get documentName(): string;

            /**
             * Obtain a reference to the Array of source data within the data object for a certain Embedded Document name
             * @param embeddedName  The name of the Embedded Document type
             * @return              The Array of source data where Embedded Entities of this type are stored
             */
            getEmbeddedCollection(embeddedName: string): EmbeddedCollection<Document>;

            /** The canonical name of this Document type, for example "Actor". */
            static get documentName(): string;

            /** The canonical identifier for this Document */
            get id(): string;

            /** Test whether this Document is embedded within a parent Document */
            get isEmbedded(): boolean;

            /** The name of this Document, if it has one assigned */
            get name(): string;

            /* ---------------------------------------- */
            /*  Methods                                 */
            /* ---------------------------------------- */

            /**
             * Test whether a given User has a sufficient role in order to create Documents of this type.
             * @param user The User being tested
             * @return Does the User have a sufficient role to create?
             */
            static canUserCreate(user: documents.BaseUser): boolean;

            /**
             * Clone a document, creating a new document by combining current data with provided overrides.
             * The cloned document is ephemeral and not yet saved to the database.
             * @param [data={}]                Additional data which overrides current document data at the time of creation
             * @param [options={}]             Additional options which customize the creation workflow
             * @param [options.save=false]    Save the clone to the World database?
             * @param [options.keepId=false]  Keep the original Document ID? Otherwise the ID will become undefined
             * @returns The cloned Document instance
             */
            clone(
                data?: DocumentModificationContext,
                options?: { save?: boolean; keepId?: boolean },
            ): this | Promise<this>;

            /**
             * Get the permission level that a specific User has over this Document, a value in CONST.ENTITY_PERMISSIONS.
             * @param user The User being tested
             * @returns A numeric permission level from CONST.ENTITY_PERMISSIONS or null
             */
            getUserLevel(user: documents.BaseUser): DocumentPermission | null;

            /**
             * Test whether a certain User has a requested permission level (or greater) over the Document
             * @param user The User being tested
             * @param permission The permission level from ENTITY_PERMISSIONS to test
             * @param options Additional options involved in the permission test
             * @param [options.exact=false] Require the exact permission level requested?
             * @return Does the user have this permission level over the Document?
             */
            testUserPermission(
                user: documents.BaseUser,
                permission: DocumentPermission | string,
                { exact }?: { exact?: boolean },
            ): boolean;

            /**
             * Test whether a given User has permission to perform some action on this Document
             * @param user   The User attempting modification
             * @param action The attempted action
             * @param [data] Data involved in the attempted action
             * @return Does the User have permission?
             */
            canUserModify(user: documents.BaseUser, action: UserAction, data?: Record<string, unknown>): boolean;

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
            static createDocuments(
                data?: DocumentSource[],
                context?: DocumentModificationContext,
            ): Promise<foundry.abstract.Document[]>;

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
            static updateDocuments(
                updates?: DocumentUpdateData,
                context?: DocumentModificationContext,
            ): Promise<Document[]>;

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
            static deleteDocuments(ids?: string[], context?: DocumentModificationContext): Promise<Document[]>;

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
            static create(
                // @ts-ignore
                data: PreCreate<DocumentSource>,
                context?: DocumentModificationContext,
            ): Promise<Document>;

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
            update(
                data: DocumentUpdateData | Partial<DocumentSource>,
                options?: DocumentModificationContext,
            ): Promise<this>;

            /**
             * Delete the current Document.
             * @see {Document.delete}

             * @param  context  Options which customize the deletion workflow
             * @return  The deleted Document
             */
            delete(context?: DocumentModificationContext): Promise<this>;

            /**
             * Document-specific actions that should occur when the Document is first created
             */
            protected _onCreate(data: object, options: object, userId: string, context: object): void;

            /**
             * Document-specific actions that should occur when the Document is updated
             */
            protected _onUpdate(data: object, options: object, userId: string, context: object): void;

            /**
             * Document-specific actions that should occur when the Document is deleted
             */
            protected _onDelete(id: string, options: object, userId: string, context: any): void;

            /* -------------------------------------------- */
            /*  Embedded Document Management                  */
            /* -------------------------------------------- */

            /**
             * Get an Embedded Document by its ID from a named collection in the parent
             * @param collection    The named collection of embedded entities
             * @param id            The ID of the child to retrieve
             * @return              Retrieved data for the requested child, or null
             */
            getEmbeddedDocument(
                collection: keyof typeof Document['metadata']['embedded'],
                id: string,
                { strict }?: { strict?: boolean },
            ): DocumentData;

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
                data: Partial<DocumentSource>[],
                context?: DocumentModificationContext,
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
                updateData: EmbeddedDocumentUpdateData[],
                context?: DocumentModificationContext,
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
                context?: DocumentModificationContext,
            ): Promise<Document[]>;

            /**
             * Handle Embedded Document creation within this Document with specific callback steps.
             * This function is triggered once per EmbeddedEntity which is updated.
             * It therefore may run multiple times per creation workflow.
             * Any steps defined here should run on a per-EmbeddedEntity basis.
             * Steps that should run once for the whole batch should go in _onModifyEmbeddedEntity()
             */
            protected _onCreateEmbeddedDocuments(
                embeddedName: string,
                documents: Document[],
                options: DocumentModificationContext,
                userId: string,
            ): void;

            /**
             * Handle Embedded Document updates within this Document with specific callback steps.
             * This function is triggered once per EmbeddedEntity which is updated.
             * It therefore may run multiple times per creation workflow.
             * Any steps defined here should run on a per-EmbeddedEntity basis.
             * Steps that should run once for the whole batch should go in _onModifyEmbeddedEntity()
             */
            protected _onUpdateEmbeddedDocuments(
                embeddedName: string,
                documents: Document[],
                updateData: EmbeddedDocumentUpdateData[],
                options: DocumentModificationContext,
                userId: string,
            ): void;

            /**
             * Handle Embedded Document deletion within this Document with specific callback steps.
             * This function is triggered once per EmbeddedEntity which is updated.
             * It therefore may run multiple times per creation workflow.
             * Any steps defined here should run on a per-EmbeddedEntity basis.
             * Steps that should run once for the whole batch should go in _onModifyEmbeddedEntity()
             */
            protected _onDeleteEmbeddedDocuments(
                embeddedName: string,
                documents: Document[],
                options: DocumentModificationContext,
                userId: string,
            ): void;

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
            getFlag(scope: string, key: string): any;

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
             * @return      A Promise resolving to the updated Document
             */
            unsetFlag(scope: string, key: string): Promise<this>;

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
            toObject(source?: boolean): RawObject<this['data']>;

            /**
             * Serializing an Document should simply serialize its inner data, not the entire instance
             */
            toJSON(): RawObject<this['data']>;
        }

        /**
         * @typedef DocumentModificationContext
         * @property [parent]       A parent Document within which these Documents should be embedded
         * @property [pack]         A Compendium pack identifier within which the Documents should be modified
         * @property [noHook=false] Block the dispatch of preCreate hooks for this operation
         * @property [index=false]  Return an index of the Document collection, used only during a get operation.
         * @property [temporary=false] Create a temporary document which is not saved to the database. Only used during creation.
         * @property [render=true] Automatically re-render existing applications associated with the document.
         * @property [renderSheet=false] Automatically create and render the Document sheet when the Document is first created.
         * @property [diff=true] Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         * @property [recursive=true] Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         * @property [isUndo] Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         * @property [deleteAll] Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        interface DocumentModificationContext {
            parent?: Document;
            pack?: string;
            noHook?: boolean;
            index?: boolean;
            temporary?: boolean;
            render?: boolean;
            renderSheet?: boolean;
            diff?: boolean;
            recursive?: boolean;
            isUndo?: boolean;
            deleteAll?: boolean;
        }

        interface DocumentMetadata {
            collection: string;
            embedded: Record<string, new (...args: any[]) => Document>;
            hasSystemData: boolean;
            isEmbedded?: boolean;
            isPrimary?: boolean;
            name: string;
            pack: null;
            permissions: Record<UserAction, MetadataPermission>;
            types: string[];
        }
    }
}

declare type DocumentModificationContext = foundry.abstract.DocumentModificationContext;

declare type DocumentPermission = typeof CONST.ENTITY_PERMISSIONS[keyof typeof CONST.ENTITY_PERMISSIONS];

declare type Embedded<T extends foundry.abstract.Document> = T & {
    readonly parent: NonNullable<T['parent']>;
};

// type PreCreate<D extends foundry.abstract.DocumentSource> = D extends { type: string }
//     ? Omit<Partial<D>, 'type'> & { type: D['type'] }
//     : Partial<D>;

declare type DocumentUpdateData = Record<string, unknown>;
declare type EmbeddedDocumentUpdateData =
    | (Partial<foundry.abstract.DocumentData> & { _id: string })
    | { _id: string; [key: string]: unknown };

interface DocumentRenderOptions extends RenderOptions {
    data?: {
        permission?: boolean;
    };
}

declare type DataWithType = foundry.data.ActorData | foundry.data.ItemData | foundry.data.MacroData;

type MetadataPermission =
    | keyof typeof CONST.USER_ROLES
    | keyof typeof CONST.USER_PERMISSIONS
    | ((user: User) => boolean);
