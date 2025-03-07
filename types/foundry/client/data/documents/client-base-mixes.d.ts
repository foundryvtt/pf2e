import type {
    ApplicationV2,
    DocumentSheetConfiguration,
    DocumentSheetV2,
} from "../../../client-esm/applications/api/module.d.ts";

/* eslint-disable @typescript-eslint/no-unsafe-function-type */

export declare class ClientBaseAmbientLight<TParent extends ClientBaseScene | null> extends foundry.documents
    .BaseAmbientLight<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseAmbientLight<TParent extends ClientBaseScene | null> extends ClientBaseAmbientLight<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}

declare class ClientBaseAmbientSound<TParent extends ClientBaseScene | null> extends foundry.documents
    .BaseAmbientSound<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseAmbientSound<TParent extends ClientBaseScene | null> extends ClientBaseAmbientSound<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}

export class ClientBaseActiveEffect<
    TParent extends
        | ClientBaseActor<CanvasBaseToken<ClientBaseScene | null> | null>
        | ClientBaseItem<ClientBaseActor<CanvasBaseToken<ClientBaseScene | null> | null> | null>
        | null,
> extends foundry.documents.BaseActiveEffect<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseActor<TParent extends CanvasBaseToken<ClientBaseScene | null> | null> extends foundry.documents
    .BaseActor<TParent> {
    protected _sheet: DocumentSheet<ClientBaseActor<CanvasBaseToken<ClientBaseScene | null> | null>> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in string]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet():
        | DocumentSheet<ClientBaseActor<CanvasBaseToken<ClientBaseScene | null> | null>>
        | DocumentSheetV2<DocumentSheetConfiguration<ClientBaseActor<CanvasBaseToken<ClientBaseScene | null> | null>>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param data             Initial data with which to populate the creation form
     * @param [context={}]     Additional context options or dialog positioning options
     * @param [context.parent] A parent document within which the created Document should belong
     * @param [context.pack]   A compendium pack within which the Document should be created
     * @param [context.types]  A restriction the selectable sub-types of the Dialog.
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     * @memberof ClientDocumentMixin
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
            types?: string[];
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseActorDelta<TParent extends CanvasBaseToken<ClientBaseScene | null> | null> extends foundry
    .documents.BaseActorDelta<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseAdventure extends foundry.documents.BaseAdventure {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseCard<TParent extends ClientBaseCards | null> extends foundry.documents.BaseCard<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseCards extends foundry.documents.BaseCards {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseChatMessage extends foundry.documents.BaseChatMessage {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseCombat extends foundry.documents.BaseCombat {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseCombatant<TParent extends ClientBaseCombat | null> extends foundry.documents
    .BaseCombatant<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

declare class ClientBaseDrawing<TParent extends ClientBaseScene | null> extends foundry.documents.BaseDrawing<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseDrawing<TParent extends ClientBaseScene | null> extends ClientBaseDrawing<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}

export class ClientBaseFogExploration extends foundry.documents.BaseFogExploration {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): null;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseFolder extends foundry.documents.BaseFolder {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseItem<
    TParent extends ClientBaseActor<CanvasBaseToken<ClientBaseScene | null> | null> | null,
> extends foundry.documents.BaseItem<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseJournalEntry extends foundry.documents.BaseJournalEntry {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseJournalEntryPage<TParent extends ClientBaseJournalEntry | null> extends foundry.documents
    .BaseJournalEntryPage<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseMacro extends foundry.documents.BaseMacro {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

declare class ClientBaseMeasuredTemplate<TParent extends ClientBaseScene | null> extends foundry.documents
    .BaseMeasuredTemplate<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseMeasuredTemplate<
    TParent extends ClientBaseScene | null,
> extends ClientBaseMeasuredTemplate<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}

declare class ClientBaseNote<TParent extends ClientBaseScene | null> extends foundry.documents.BaseNote<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseNote<TParent extends ClientBaseScene | null> extends ClientBaseNote<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}

export class ClientBasePlaylist extends foundry.documents.BasePlaylist {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBasePlaylistSound<TParent extends ClientBasePlaylist | null> extends foundry.documents
    .BasePlaylistSound<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

declare class ClientBaseRegion<TParent extends ClientBaseScene | null> extends foundry.documents.BaseRegion<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this>;

    /** A Universally Unique Identifier (uuid) for this Document instance. */
    get uuid(): DocumentUUID;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param options    Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param options    Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent         The direct parent of the updated Documents, may be this Document or a child
     * @param collection       The collection within which documents are being updated
     * @param changes        The array of differential Document updates to be applied
     * @param options          Options which modified the update operation
     * @param userId           The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param options    Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param options    Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param options    Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseRegion<TParent extends ClientBaseScene | null> extends ClientBaseRegion<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}

export class ClientBaseRegionBehavior<TParent extends ClientBaseRegion<ClientBaseScene | null> | null> extends foundry
    .documents.BaseRegionBehavior<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this>;

    /** A Universally Unique Identifier (uuid) for this Document instance. */
    get uuid(): DocumentUUID;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param options    Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param options    Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent         The direct parent of the updated Documents, may be this Document or a child
     * @param collection       The collection within which documents are being updated
     * @param changes        The array of differential Document updates to be applied
     * @param options          Options which modified the update operation
     * @param userId           The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param options    Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param options    Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param options    Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseRollTable extends foundry.documents.BaseRollTable {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseScene extends foundry.documents.BaseScene {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number | string]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseSetting extends foundry.documents.BaseSetting {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

export class ClientBaseTableResult<TParent extends ClientBaseRollTable | null> extends foundry.documents
    .BaseTableResult<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

declare class ClientBaseTile<TParent extends ClientBaseScene | null> extends foundry.documents.BaseTile<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseTile<TParent extends ClientBaseScene | null> extends ClientBaseTile<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}

declare class ClientBaseToken<TParent extends ClientBaseScene | null> extends foundry.documents.BaseToken<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseToken<TParent extends ClientBaseScene | null> extends ClientBaseToken<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}

export class ClientBaseUser<TCharacter extends ClientBaseActor<null>> extends foundry.documents.BaseUser<TCharacter> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<null>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<null>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

declare class ClientBaseWall<TParent extends ClientBaseScene | null> extends foundry.documents.BaseWall<TParent> {
    protected _sheet: DocumentSheet<this> | null;

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application | ApplicationV2 };

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Return a reference to the parent Collection instance which contains this Document. */
    get collection(): Collection<this>;

    /** A reference to the Compendium Collection which contains this Document, if any, otherwise undefined. */
    get compendium(): CompendiumCollection<CompendiumDocument> | undefined;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /** Test whether this Document is owned by any non-Gamemaster User. */
    get hasPlayerOwner(): boolean;

    /** A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater). */
    get limited(): boolean;

    /** Return a string which creates a dynamic link to this Document instance. */
    get link(): string;

    /**
     * Return the permission level that the current game User has over this Document.
     * See the CONST.DOCUMENT_OWNERSHIP_LEVELS object for an enumeration of these levels.
     *
     * @example Get the permission level the current user has for a document
     * \`\`\`js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * \`\`\`
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): DocumentSheet<this> | DocumentSheetV2<DocumentSheetConfiguration<this>>;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Obtain the FormApplication class constructor which should be used to configure this Document. */
    protected _getSheetClass(): Maybe<Function>;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /** Prepare data related to this Document itself, before any embedded Documents or derived data is computed. */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     * @memberof ClientDocumentMixin#
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all of the Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param [force=false] Force rendering
     * @param [context={}] Optional context
     */
    render(force?: boolean, context?: RenderOptions): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param [options]            Sorting options provided to SortingHelper.performIntegerSort
     * @param [options.updateData] Additional data changes which are applied to each sorted document
     * @param [sortOptions]        Options which are passed to the SortingHelpers.performIntegerSort method
     * @returns The Document after it has been re-sorted
     */
    sortRelative({ updateData, ...sortOptions }: { updateData?: object } & SortingOptions<this>): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    getRelativeUUID(doc: foundry.abstract.Document): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event    The triggering click event.
     */
    protected _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param [_parent]  The document with directly modified embedded documents. Either this document or a descendant
     *                   of this one.
     * @internal
     */
    protected _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: unknown[],
        _parent?: foundry.abstract.Document,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments(
        parent: this,
        collection: string,
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created and changes have been applied to client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param operation  Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        data: object[],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments(
        parent: this,
        collection: string,
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated and changes have been applied to client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents were updated
     * @param documents  The array of updated Documents
     * @param changes    The array of differential Document updates which were applied
     * @param operation  Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments(
        parent: this,
        collection: string,
        documents: ClientDocument[],
        changes: object[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preDeleteDescendantDocuments(
        parent: this,
        collection: string,
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param documents  The array of Documents which were deleted
     * @param ids        The array of document IDs which were deleted
     * @param operation  Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;

    /** Gets the default new name for a Document */
    static defaultName(): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param [data]       Initial data with which to populate the creation form
     * @param [context={}] Additional context options or dialog positioning options
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: ConfirmDialogParameters): Promise<this>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * @param [options] Additional options passed to the {@link ClientDocumentMixin#toCompendium} method
     */
    exportToJSON(options?: Record<string, unknown>): void;

    /**
     * Create a content link for this Document.
     * @param [options] Additional options to configure how the link is constructed.
     * @param [options.attrs]   Attributes to set on the link.
     * @param [options.dataset] Custom data- attributes to set on the link.
     * @param [options.classes] Classes to add to the link.
     * @param [options.name]    A name to use for the Document, if different from the Document's name.
     * @param [options.icon]    A font-awesome icon class to use as the icon, if different to the Document's configured sidebarIcon.
     */
    toAnchor(options?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        name?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns An object of drag data.
     */
    toDragData(): { type: string; [key: string]: unknown };

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;

    /**
     * Update this Document using a provided JSON string.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /** Render an import dialog for updating the data related to this Document through an exported JSON file */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param [pack]    A specific pack being exported to
     * @param [options] Additional options which modify how the document is converted
     * @param [options.clearFlags=false]     Clear the flags object
     * @param [options.clearSort=true]       Clear the currently assigned folder and sort order
     * @param  [options.clearOwnership=true] Clear document ownership
     * @param [options.clearState=true]      Clear fields which store document state
     * @param [options.keepId=false]         Retain the current Document id
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(
        pack?: CompendiumCollection<CompendiumDocument>,
        options?: {
            clearSort?: boolean;
            clearFlags?: boolean;
            clearOwnership?: boolean;
            clearState?: boolean;
            keepId?: boolean;
        },
    ): this["_source"];
}

/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
export class CanvasBaseWall<TParent extends ClientBaseScene | null> extends ClientBaseWall<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context?: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected override _onCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void;
}
