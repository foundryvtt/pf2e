/** System note: refactored `ClientDocument` mixin typing approach in testing */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare class ClientDocument2<TParent extends ClientDocument2<any> | null = ClientDocument2<any> | null> extends foundry
    .abstract.Document {
    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @see {@link Document#render}
     */
    apps: { [K in number]?: Application };

    constructor(data: object, context: DocumentConstructionContext<TParent>);

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
     * ```js
     * game.user.id; // "dkasjkkj23kjf"
     * actor.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * actor.permission; // 2
     * ```
     */
    get permission(): DocumentOwnershipLevel;

    /** Lazily obtain a FormApplication instance used to configure this Document, or null if no sheet is available. */
    get sheet(): FormApplication<this> | null;

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
    sortRelative({ updateData, ...sortOptions }: { updateData?: object; sortOptions?: object }): Promise<void>;

    /**
     * Construct a UUID relative to another document.
     * @param doc The document to compare against.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getRelativeUUID(doc: ClientDocument2<any>): string;

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
        options: DocumentModificationContext<this>,
        userId: string
    ): void;

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<this>,
        userId: string
    ): void;

    protected override _onDelete(options: DocumentModificationContext<this>, userId: string): void;

    /**
     * Preliminary actions taken before a set of embedded Documents in this parent Document are created.
     * @param embeddedName The name of the embedded Document type
     * @param result       An Array of created data objects
     * @param options      Options which modified the creation operation
     * @param userId       The ID of the User who triggered the operation
     */
    protected _preCreateEmbeddedDocuments(
        embeddedName: string,
        result: object[],
        options: DocumentModificationContext<this>,
        userId: string
    ): void;

    /**
     * Follow-up actions taken after a set of embedded Documents in this parent Document are created.
     * @param embeddedName The name of the embedded Document type
     * @param documents    An Array of created Documents
     * @param result       An Array of created data objects
     * @param options      Options which modified the creation operation
     * @param userId       The ID of the User who triggered the operation
     */
    protected _onCreateEmbeddedDocuments(
        embeddedName: string,
        documents: ClientDocument2<this>[],
        result: object[],
        options: DocumentModificationContext<this>,
        userId: string
    ): void;

    /**
     * Preliminary actions taken before a set of embedded Documents in this parent Document are updated.
     * @param embeddedName The name of the embedded Document type
     * @param result       An Array of incremental data objects
     * @param options      Options which modified the update operation
     * @param userId       The ID of the User who triggered the operation
     */
    protected _preUpdateEmbeddedDocuments(
        embeddedName: string,
        result: object[],
        options: DocumentModificationContext<this>,
        userId: string
    ): void;

    /**
     * Follow-up actions taken after a set of embedded Documents in this parent Document are updated.
     * @param embeddedName The name of the embedded Document type
     * @param documents    An Array of updated Documents
     * @param result       An Array of incremental data objects
     * @param options      Options which modified the update operation
     * @param userId       The ID of the User who triggered the operation
     */
    protected _onUpdateEmbeddedDocuments(
        embeddedName: string,
        documents: ClientDocument2<this>[],
        result: object,
        options: DocumentUpdateContext<this>,
        userId: string
    ): void;

    /**
     * Preliminary actions taken before a set of embedded Documents in this parent Document are deleted.
     * @param embeddedName The name of the embedded Document type
     * @param result       An Array of document IDs being deleted
     * @param options      Options which modified the deletion operation
     * @param userId       The ID of the User who triggered the operation
     */
    protected _preDeleteEmbeddedDocuments(
        embeddedName: string,
        result: string[],
        options: DocumentModificationContext<this>,
        userId: string
    ): void;

    /**
     * Follow-up actions taken after a set of embedded Documents in this parent Document are deleted.
     * @param embeddedName The name of the embedded Document type
     * @param documents    An Array of deleted Documents
     * @param result       An Array of document IDs being deleted
     * @param options      Options which modified the deletion operation
     * @param userId       The ID of the User who triggered the operation
     */
    protected _onDeleteEmbeddedDocuments(
        embeddedName: string,
        documents: ClientDocument[],
        result: string[],
        options: DocumentModificationContext<this>,
        userId: string
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
    static createDialog(
        data?: Record<string, unknown>,
        {
            parent,
            pack,
            ...options
        }?: {
            parent: ClientDocument | null;
            pack: CompendiumCollection<CompendiumDocument> | null;
            options?: Record<string, unknown>;
        }
    ): Promise<InstanceType<typeof this> | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param [options] Positioning and sizing options for the resulting dialog
     * @return A Promise which resolves to the deleted Document
     */
    deleteDialog(options?: Record<string, unknown>): Promise<this>;

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
    toDragData(): object;

    /**
     * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
     * The dropped data could have:
     * 1. A data object explicitly provided
     * 2. A UUID
     * @memberof ClientDocumentMixin
     *
     * @param data    The data object extracted from a DataTransfer event
     * @param options Additional options which affect drop data behavior
     * @returns The resolved Document
     * @throws If a Document could not be retrieved from the provided data.
     */
    static fromDropData(data?: object, options?: Record<string, unknown>): Promise<ClientDocument>;

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
        }
    ): this["_source"];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare interface ClientDocument2<TParent extends ClientDocument2<any> | null = ClientDocument2<any> | null>
    extends foundry.abstract.Document {
    readonly parent: TParent;
}

type BaseDocumentWithOmissions<TDocument extends foundry.abstract.Document> = Omit<
    TDocument,
    | "_initialize"
    | "_source"
    | "clone"
    | "delete"
    | "documentName"
    | "getUserLevel"
    | "parent"
    | "setFlag"
    | "toJSON"
    | "toObject"
    | "unsetFlag"
    | "update"
    | "updateSource"
>;
