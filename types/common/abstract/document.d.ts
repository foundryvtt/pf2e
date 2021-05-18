// @ts-nocheck

export {};

declare global {
    function fromUuid(uuid: string): Promise<CompendiumDocument | null>;

    type DocumentPermission = typeof CONST.ENTITY_PERMISSIONS[keyof typeof CONST.ENTITY_PERMISSIONS];

    type Embedded<T extends foundry.abstract.Document> = T & {
        readonly parent: NonNullable<T['parent']>;
    };

    // type PreCreate<D extends foundry.abstract.DocumentSource> = D extends { type: string }
    //     ? Omit<Partial<D>, 'type'> & { type: D['type'] }
    //     : Partial<D>;

    interface DocumentMetadata {
        collection: string;
        embedded: Record<string, new (...args: any[]) => foundry.abstract.Document>;
        hasSystemData: boolean;
        isEmbedded?: boolean;
        isPrimary?: boolean;
        name: string;
        pack: null;
        permissions: Record<UserAction, MetadataPermission>;
        types: string[];
    }

    type DocumentUpdateData = Record<string, unknown>;
    type EmbeddedDocumentUpdateData =
        | (Partial<foundry.abstract.DocumentData> & { _id: string })
        | { _id: string; [key: string]: unknown };

    interface DocumentRenderOptions extends RenderOptions {
        data?: {
            permission?: boolean;
        };
    }

    type DataWithType = foundry.data.ActorData | foundry.data.ItemData | foundry.data.MacroData;

    module foundry {
        module abstract {
            type DocumentConstructorData<T extends DocumentData> = T | ReturnType<T['toObject']>;

            interface DocumentConstructorContext<T extends Document | null = Document | null> {
                parent?: T;
                compendium?: CompendiumCollection | null;
                [key: string]: unknown;
            }

            /**
             * The abstract base interface for all Document types.
             * @abstract
             * @interface
             * @memberof abstract
             */
            class Document {
                constructor(
                    data: DocumentConstructorData<foundry.abstract.DocumentData>,
                    context?: DocumentConstructorContext,
                );

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
                readonly data: foundry.abstract.DocumentData;

                /**
                 * A cached reference to the FormApplication instance used to configure this Document.
                 */
                readonly _sheet: FormApplication | null;

                /**
                 * A collection of Application instances which should be re-rendered whenever this Document experiences an update to
                 * its data. The keys of this object are the application ids and the values are Application instances. Each
                 * Application in this object will have its render method called by {@link Document#render}.
                 */
                apps: Record<number, Application>;

                /**
                 * The Document may optionally belong to a parent Compendium pack. If so this attribute will contain a reference
                 * to that Compendium object. Otherwise null.
                 */
                compendium: CompendiumCollection;

                /* -------------------------------------------- */
                /*  Configuration                               */
                /* -------------------------------------------- */

                /**
                 * Every document must define an object which represents its data schema.
                 * This must be a subclass of the DocumentData interface.
                 */
                static get schema(): typeof foundry.abstract.DocumentData;

                /** Default metadata which applies to each instance of this Document type. */
                static get metadata(): DocumentMetadata;

                /**
                 * Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available.
                 * @memberof ClientDocumentMixin#
                 */
                get sheet(): NonNullable<this['_sheet']>;

                /**
                 * A Universally Unique Identifier (uuid) for this Document instance
                 */
                get uuid(): string;

                /**
                 * Initialize data structure for the Document.
                 * First initialize any Embedded Entities and prepare their data.
                 * Next prepare data for the Document itself, which may depend on Embedded Entities.
                 */
                initialize(): void;

                /**
                 * Prepare data for the Document.
                 * Begin by resetting the prepared data back to its source state.
                 * Next prepare any embedded Documents and compute any derived data elements.
                 * @memberof ClientDocumentMixin#
                 */
                prepareData(): void;

                /**
                 * Prepare Embedded Entities which exist within this parent Document.
                 * For example, in the case of an Actor, this method is responsible for preparing the Owned Items the Actor contains.
                 */
                prepareEmbeddedEntities(): void;

                /**
                 * Prepare data for a single Embedded Document which exists within the parent Document.
                 * @param embeddedName  The name of the Embedded Document type
                 * @param data          The data used to initialize it
                 * @returns             The Embedded Document object
                 */
                private _constructEmbeddedEntity(embeddedName: string, data: object): void;

                /**
                 * Obtain a reference to the Array of source data within the data object for a certain Embedded Document name
                 * @param embeddedName  The name of the Embedded Document type
                 * @return              The Array of source data where Embedded Entities of this type are stored
                 */
                getEmbeddedCollection(embeddedName: string): EmbeddedCollection<Document>;

                /* -------------------------------------------- */
                /*  Properties
                    /* -------------------------------------------- */

                /**
                 * Return a reference to the Collection instance which stores Document instances of this type. This property is
                 * available as both a static and instance method and should be overridden by subclass Document implementations.
                 */
                static get collection(): foundry.utils.Collection<Document>;

                /** @alias Document.collection */
                get collection(): foundry.utils.Collection<Document>;

                /**
                 * The class name of the base Document type, for example "Actor". This is useful in cases where there is an inheritance
                 * chain. Many places throughout the framework rely upon the canonical entity name which may not always be equal
                 * to the class name. This property is available as both a static and instance method.
                 *
                 * @example
                 * class Actor2ndGen extends Actor {...}
                 * Actor2ndGen.entity // "Actor"
                 */
                static get documentName(): string;

                /** @alias Document.entity */
                get entity(): Document;

                /**
                 * A convenience accessor for the _id attribute of the Document data object
                 */
                get id(): string;

                /**
                 * A convenience accessor for the name attribute of the Document data object
                 */
                get name(): string;

                /**
                 * Obtain a reference to the BaseEntitySheet implementation which should be used to render the Document instance
                 * configuration sheet.
                 */
                protected get _sheetClass(): typeof FormApplication;

                /**
                 * Return a reference to the Folder which this Document belongs to, if any.
                 *
                 * @example <caption>Entities may belong to Folders</caption>
                 * let folder = game.folders.entities[0];
                 * let actor = await Actor.create({name: "New Actor", folder: folder.id});
                 * console.log(actor.data.folder); // folder.id;
                 * console.log(actor.folder); // folder;
                 */
                get folder(): Folder | null;

                /**
                 * Return an array of User entities who have a certain permission level or greater to the Document.
                 * @param permission  The permission level or level name to test
                 * @param exact       Tests for an exact permission level match, by default this method tests for
                 *                                      an equal or greater permission level
                 * @returns  An array of User entities who match the permission level
                 */
                getUsers(permission: string, exact?: boolean): User[];

                /**
                 * Return the permission level that the current game User has over this Document.
                 * See the CONST.ENTITY_PERMISSIONS object for an enumeration of these levels.
                 * @memberof ClientDocumentMixin#
                 *
                 * @example
                 * game.user.id; // "dkasjkkj23kjf"
                 * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
                 * actor.permission; // 2
                 */
                get permission(): DocumentPermission;

                /**
                 * A boolean indicator for whether or not the current game User has ownership rights for this Document
                 * This property has a setter which allows for ownership rights to be overridden specifically on a per-instance basis
                 */
                set isOwner(isOwner: boolean);

                get isOwner(): boolean;

                /**
                 * A boolean indicator for whether or not the current game User has at least limited visibility for this Document.
                 */
                get visible(): boolean;

                /**
                 * A boolean indicator for whether the current game user has ONLY limited visibility for this Document.
                 * Note that a GM user's perspective of an Document is never limited.
                 */
                get limited(): boolean;

                /* -------------------------------------------- */
                /* Methods
                   /* -------------------------------------------- */

                /**
                 * Render all of the Application instances which are connected to this Document by calling their respective
                 * {@link Application#render} methods.
                 * @param  force   Force rendering
                 * @param  context Optional context
                 */
                render(force?: boolean, context?: DocumentRenderOptions): unknown;

                /**
                 * Test whether a provided User a specific permission level (or greater) over the Document instance
                 * @param user          The user to test for permission
                 * @param permission    The permission level or level name to test
                 * @param exact         Tests for an exact permission level match, by default this method tests for
                 *                      an equal or greater permission level.
                 * @return              Whether or not the user has the permission for this Document.
                 *
                 * @example <caption>Test whether a specific user has a certain permission</caption>
                 * // These two are equivalent
                 * entity.hasPerm(game.user, "OWNER");
                 * entity.owner;
                 * // These two are also equivalent
                 * entity.hasPerm(game.user, "LIMITED", true);
                 * entity.limited;
                 */
                hasPerm(user: User, permission: string | number, exact?: boolean): boolean;

                /* -------------------------------------------- */
                /*  Document Management Methods                   */
                /* -------------------------------------------- */

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
                 * Get an Embedded Document by it's ID from a named collection in the parent
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

                /**
                 * Present a Dialog form to create a new Document of this type.
                 * Choose a name and a type from a select menu of types.
                 * @param data Initial data with which to populate the creation form
                 * @param [options] Positioning and sizing options for the resulting dialog
                 * @return A Promise which resolves to the created Document
                 */
                static createDialog(data?: { folder?: string }, options?: FormApplicationOptions): Promise<Document>;

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

                /* -------------------------------------------- */
                /*  Sorting                                     */
                /* -------------------------------------------- */

                /**
                 * Sort this Document relative a target by providing the target, an Array of siblings and other options.
                 * See SortingHelper.performIntegerSort for more details
                 */
                sortRelative({
                    target,
                    siblings,
                    sortKey,
                    sortBefore,
                    updateData,
                }: {
                    target?: any;
                    siblings?: any[];
                    sortKey?: string;
                    sortBefore?: boolean;
                    updateData?: any;
                }): void;

                /* -------------------------------------------- */
                /*  Saving and Loading
                    /* -------------------------------------------- */

                /**
                 * Clone an Document, creating a new Document using the current data as well as provided creation overrides.
                 *
                 * @param createData    Additional data which overrides current Document data at the time of creation
                 * @param options       Additional creation options passed to the Document.create method
                 * @returns             A Promise which resolves to the created clone Document
                 */
                clone(createData?: object, options?: DocumentModificationContext): Promise<this>;

                /**
                 * Export entity data to a JSON file which can be saved by the client and later imported into a different session
                 */
                exportToJSON(): any;

                /**
                 * A helper function to handle obtaining the dropped Document data from a dropped event. Document drop data could have:
                 * 1. A compendium pack and entry id
                 * 2. A World Document _id
                 * 3. A data object explicitly provided
                 *
                 * @param data  The data object extracted from a DataTransfer event
                 * @return  The Document data that should be handled by the drop handler
                 */
                static fromDropData<T extends Document>(this: { new (...args: any): T }, data: object): Promise<T>;

                /**
                 * Import data and update this entity
                 * @param json  JSON data string
                 * @return      The updated Document
                 */
                importFromJSON(json: string): Promise<this>;

                /**
                 * Render an import dialog for updating the data related to this Document through an exported JSON file
                 */
                importFromJSONDialog(): Promise<void>;

                /**
                 * Serializing an Document should simply serialize it's inner data, not the entire instance
                 */
                toJSON(): this['data'];

                /**
                 * Test whether a given User has permission to perform some action on this Document
                 * @alias Document.can
                 */
                static canUserModify(user: User, action: UserAction, target: Document): boolean;

                /**
                 * Activate the Socket event listeners used to receive responses from events which modify database documents
                 * @param socket   The active game socket
                 */
                static activateSocketListeners(socket: any): unknown;

                canUserModify(user: User, action: string): boolean;
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
        }
    }
}

type MetadataPermission =
    | keyof typeof CONST.USER_ROLES
    | keyof typeof CONST.USER_PERMISSIONS
    | ((user: User) => boolean);
