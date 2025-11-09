import ApplicationV2 from "@client/applications/api/application.mjs";
import HTMLDocumentEmbedElement from "@client/applications/elements/document-embed.mjs";
import {
    DocumentHTMLEmbedConfig,
    EnrichmentAnchorOptions,
    EnrichmentOptions,
} from "@client/applications/ux/text-editor.mjs";
import Application from "@client/appv1/api/application-v1.mjs";
import { DropCanvasData } from "@client/helpers/hooks.mjs";
import { Collection, SortOptions } from "@client/utils/_module.mjs";
import { DocumentConstructionContext } from "@common/_types.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteCallbackOptions,
    DatabaseDeleteOperation,
    DatabaseUpdateCallbackOptions,
    DatabaseUpdateOperation,
} from "@common/abstract/_module.mjs";
import Document from "@common/abstract/document.mjs";
import { DocumentOwnershipLevel } from "@common/constants.mjs";
import { BaseUser } from "../_module.mjs";
import CompendiumCollection from "../collections/compendium-collection.mjs";

export default function ClientDocumentMixin<TParent extends Document | null, TDocument extends Document<TParent>>(
    Base: ConstructorOf<TDocument>,
): ConstructorOf<ClientDocument<TParent> & TDocument>;

export class ClientDocument<TParent extends Document | null = Document | null> extends Document<TParent> {
    readonly apps: Record<string, Application | ApplicationV2>;

    static override name: string;

    protected override _initialize(options?: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Return a reference to the parent Collection instance that contains this Document.
     */
    get collection(): Collection<string, this> | null;

    /**
     * Is this document in a compendium? A stricter check than Document#inCompendium.
     */
    get inCompendium(): boolean;

    /**
     * A boolean indicator for whether the current game User has ownership rights for this Document.
     * Different Document types may have more specialized rules for what constitutes ownership.
     */
    get isOwner(): boolean;

    /**
     * Test whether this Document is owned by any non-Gamemaster User.
     */
    get hasPlayerOwner(): boolean;

    /**
     * A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater).
     */
    get limited(): boolean;

    /**
     * Return a string which creates a dynamic link to this Document instance.
     */
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

    /**
     * Lazily obtain a Application instance used to configure this Document, or null if no sheet is available.
     */
    get sheet(): Application | ApplicationV2 | null;

    /**
     * A boolean indicator for whether the current game User has at least limited visibility for this Document.
     * Different Document types may have more specialized rules for what determines visibility.
     */
    get visible(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Obtain the Application class constructor which should be used to configure this Document.
     * @internal
     */
    _getSheetClass(): typeof Application | typeof ApplicationV2 | null;

    /**
     * Safely prepare data for a Document, catching any errors.
     * @internal
     */
    _safePrepareData(): void;

    /**
     * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
     * This method provides an opportunity for Document classes to define special data preparation logic.
     * The work done by this method should be idempotent. There are situations in which prepareData may be called more
     * than once.
     */
    prepareData(): void;

    /**
     * Prepare data related to this Document itself, before any embedded Documents or derived data is computed.
     */
    prepareBaseData(): void;

    /**
     * Prepare all embedded Document instances which exist within this primary Document.
     */
    prepareEmbeddedDocuments(): void;

    /**
     * Apply transformations or derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Render all Application instances which are connected to this document by calling their respective
     * @see Application#render
     * @param force   Force rendering
     * @param context Optional context
     */
    render(force?: boolean, context?: object): void;

    /**
     * Determine the sort order for this Document by positioning it relative a target sibling.
     * See SortingHelper.performIntegerSort for more details
     * @param options Sorting options provided to SortingHelper.performIntegerSort
     * @returns The Document after it has been re-sorted
     */
    sortRelative(options?: SortOptions<this>): Promise<this>;

    /**
     * Construct a UUID relative to another document.
     * @param relative The document to compare against.
     */
    getRelativeUUID(relative?: ClientDocument): string;

    /**
     * Create a content link for this document.
     * @param {object} eventData                     The parsed object of data provided by the drop transfer event.
     * @param {object} [options]                     Additional options to configure link generation.
     * @param {ClientDocument} [options.relativeTo]  A document to generate a link relative to.
     * @param {string} [options.label]               A custom label to use instead of the document's name.
     * @returns {string}
     * @internal
     */
    _createDocumentLink(eventData: object, options?: { relativeTo: ClientDocument; label?: string }): string;

    /**
     * Handle clicking on a content link for this document.
     * @param event The triggering click event.
     */
    protected _onClickDocumentLink(event: PointerEvent): this["sheet"] | Promise<this["sheet"]> | null;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void;

    protected override _preUpdate(
        changes: Record<string, unknown>,
        options: DatabaseUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    protected override _onUpdate(
        data: Record<string, unknown>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _preDelete(options: DatabaseDeleteCallbackOptions, user: BaseUser): Promise<boolean | void>;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

    /* -------------------------------------------- */
    /*  Descendant Document Events                  */
    /* -------------------------------------------- */

    /**
     * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
     * @param event      The event name, preCreate, onCreate, etc...
     * @param collection The collection name being modified within this parent document
     * @param args       Arguments passed to each dispatched function
     * @param _parent    The document with directly modified embedded documents. Either this document or a descendant of
     *                   this one.
     * @internal
     */
    _dispatchDescendantDocumentEvents(event: string, collection: string, args: unknown[], _parent?: Document): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents are being created
     * @param data       The source data for new documents that are being created
     * @param options    Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preCreateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        data: object[],
        options: DatabaseCreateOperation<P>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been created, but before changes are applied to the client data.
     * @param parent     The direct parent of the created Documents, may be this Document or a child
     * @param collection The collection within which documents were created
     * @param documents  The array of created Documents
     * @param data       The source data for new documents that were created
     * @param options    Options which modified the creation operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _onCreateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        data: object[],
        options: DatabaseCreateOperation<P>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent     The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param changes    The array of differential Document updates to be applied
     * @param options    Options which modified the update operation
     * @param userId     The ID of the User who triggered the operation
     */
    protected _preUpdateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<P>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
     * @param parent The direct parent of the updated Documents, may be this Document or a child
     * @param collection The collection within which documents are being updated
     * @param documents The array of updated Documents
     * @param changes The array of differential Document updates to be applied
     * @param options Options which modified the update operation
     * @param userId The ID of the User who triggered the operation
     */
    protected _onUpdateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<P>,
        userId: string,
    ): void;

    /**
     * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
     * @param parent     The direct parent of the deleted Documents, may be this Document or a child
     * @param collection The collection within which documents were deleted
     * @param ids        The array of document IDs which were deleted
     * @param options    Options which modified the deletion operation
     * @param userId     The ID of the User who triggered the operation
     * @protected
     */
    protected _preDeleteDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        ids: string[],
        options: DatabaseDeleteOperation<P>,
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
    protected _onDeleteDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        ids: string[],
        options: DatabaseDeleteOperation<P>,
        userId: string,
    ): void;

    /**
     * Whenever the Document's sheet changes, close any existing applications for this Document, and re-render the new
     * sheet if one was already open.
     * @param options.sheetOpen Whether the sheet was originally open and needs to be re-opened.
     * @internal
     */
    _onSheetChange(options?: { sheetOpen?: boolean }): Promise<void>;

    /**
     * Gets the default new name for a Document
     * @param context The context for which to create the Document name.
     * @param context.type The sub-type of the document
     * @param context.parent A parent document within which the created Document should belong
     * @param context.pack A compendium pack within which the Document should be created
     */
    static defaultName(context?: { type?: string | null; parent?: Document | null; pack?: string | null }): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param data             Document creation data
     * @param createOptions    Document creation options.
     * @param options          Options forwarded to DialogV2.prompt
     * @param options.folders  Available folders in which the new Document can be place
     * @param options.types    A restriction of the selectable sub-types of the Dialog.
     * @param options.template A template to use for the dialog contents instead of the default.
     * @param options.context  Additional render context to provide to the template.
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    static createDialog<T extends ClientDocument>(
        this: ConstructorOf<T>,
        data?: object,
        createOptions?: Partial<DatabaseCreateOperation<Document | null>>,
        options?: {
            folders?: { id: string; name: string }[];
            types?: string[];
            template?: string;
            context?: object;
        },
    ): Promise<T | null>;

    /**
     * Present a Dialog form to confirm deletion of this Document.
     * @param options   Additional options passed to `DialogV2.confirm`
     * @param operation Document deletion options.
     * @returns A Promise that resolves to the deleted Document
     */
    deleteDialog(options?: object, operation?: DatabaseDeleteOperation<TParent>): Promise<this | undefined>;

    /**
     * Export document data to a JSON file which can be saved by the client and later imported into a different session.
     * Only world Documents may be exported.
     * @param options Additional options passed to the {@link ClientDocument#toCompendium} method
     */
    exportToJSON(options?: ToCompendiumOptions): void;

    /**
     * Serialize salient information about this Document when dragging it.
     * @returns  An object of drag data.
     */
    toDragData(): DropCanvasData;

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
    static fromDropData<T extends ClientDocument>(
        this: ConstructorOf<T>,
        data: object,
        options?: object,
    ): Promise<T | null>;

    /**
     * Create the Document from the given source with migration applied to it.
     * Only primary Documents may be imported.
     *
     * This function must be used to create a document from data that predates the current core version.
     * It must be given nonpartial data matching the schema it had in the core version it is coming from.
     * It applies legacy migrations to the source data before calling {@link Document.fromSource}.
     * If this function is not used to import old data, necessary migrations may not applied to the data
     * resulting in an incorrectly imported document.
     *
     * The core version is recorded in the `_stats` field, which all primary documents have. If the given source data
     * doesn't contain a `_stats` field, the data is assumed to be pre-V10, when the `_stats` field didn't exist yet.
     * The `_stats` field must not be stripped from the data before it is exported!
     * @param source  The document data that is imported.
     * @param context The model construction context passed to {@link Document.fromSource}.
     * @param context.strict Strict validation is enabled by default.
     */
    fromImport<T extends typeof Document>(
        this: T,
        source: object,
        context?: DocumentConstructionContext<Document | null> & { strict?: boolean },
    ): Promise<InstanceType<T>>;

    /**
     * Update this Document using a provided JSON string.
     * Only world Documents may be imported.
     * @param json Raw JSON data to import
     * @returns The updated Document instance
     */
    importFromJSON(json: string): Promise<this>;

    /**
     * Render an import dialog for updating the data related to this Document through an exported JSON file
     */
    importFromJSONDialog(): Promise<void>;

    /**
     * Transform the Document data to be stored in a Compendium pack.
     * Remove any features of the data which are world-specific.
     * @param pack A specific pack being exported to
     * @param options Additional options which modify how the document is converted
     * @returns A data object of cleaned data suitable for compendium import
     */
    toCompendium(pack?: CompendiumCollection, options?: ToCompendiumOptions): object;

    /* -------------------------------------------- */
    /*  Enrichment                                  */
    /* -------------------------------------------- */

    /**
     * Create a content link for this Document.
     * @param options Additional options to configure how the link is constructed.
     */
    toAnchor(options?: Partial<EnrichmentAnchorOptions>): HTMLAnchorElement;

    /**
     * Convert a Document to some HTML display for embedding purposes.
     * @param config  Configuration for embedding behavior.
     * @param options The original enrichment options for cases where the Document embed content also contains text that
     *                must be enriched.
     * @returns A representation of the Document as HTML content, or null if such a representation could not be generated.
     */
    toEmbed(
        config: DocumentHTMLEmbedConfig,
        options?: EnrichmentOptions,
    ): Promise<HTMLDocumentEmbedElement | HTMLElement | null>;

    /**
     * Specific callback actions to take when the embedded HTML for this Document has been added to the DOM.
     * @param element The embedded document HTML
     */
    onEmbed(element: HTMLDocumentEmbedElement): void;

    /**
     * A method that can be overridden by subclasses to customize embedded HTML generation.
     * @param config  Configuration for embedding behavior.
     * @param options The original enrichment options for cases where the Document embed content also contains text that
     *                must be enriched.
     * @returns  Either a single root element to append, or a collection of elements that comprise the embedded content.
     */
    protected _buildEmbedHTML(
        config: DocumentHTMLEmbedConfig,
        options?: EnrichmentOptions,
    ): Promise<HTMLElement | HTMLCollection | null>;

    /**
     * A method that can be overridden by subclasses to customize inline embedded HTML generation.
     * @param content The embedded content.
     * @param config  Configuration for embedding behavior.
     * @param options The original enrichment options for cases where the Document embed content also contains text that
     *                must be enriched.
     */
    protected _createInlineEmbed(
        content: HTMLElement | HTMLCollection,
        config?: DocumentHTMLEmbedConfig,
        options?: EnrichmentOptions,
    ): Promise<HTMLElement | null>;

    /**
     * A method that can be overridden by subclasses to customize the generation of the embed figure.
     * @param content The embedded content.
     * @param config  Configuration for embedding behavior.
     * @param options The original enrichment options for cases where the Document embed content also contains text that
     *                must be enriched.
     */
    protected _createFigureEmbed(
        content: HTMLElement | HTMLCollection,
        config: DocumentHTMLEmbedConfig,
        options: EnrichmentOptions,
    ): Promise<HTMLElement | null>;
}

export interface ClientDocumentStatic {
    /**
     * Gets the default new name for a Document
     * @param context The context for which to create the Document name.
     * @param context.type The sub-type of the document
     * @param context.parent A parent document within which the created Document should belong
     * @param context.pack A compendium pack within which the Document should be created
     */
    defaultName(context?: { type?: string | null; parent?: Document | null; pack?: string | null }): string;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Present a Dialog form to create a new Document of this type.
     * Choose a name and a type from a select menu of types.
     * @param data             Document creation data
     * @param createOptions    Document creation options.
     * @param options          Options forwarded to DialogV2.prompt
     * @param options.folders  Available folders in which the new Document can be place
     * @param options.types    A restriction of the selectable sub-types of the Dialog.
     * @param options.template A template to use for the dialog contents instead of the default.
     * @param options.context  Additional render context to provide to the template.
     * @returns A Promise which resolves to the created Document, or null if the dialog was closed.
     */
    createDialog<T extends ClientDocument>(
        this: ConstructorOf<T>,
        data?: object,
        createOptions?: Partial<DatabaseCreateOperation<Document | null>>,
        options?: {
            folders?: { id: string; name: string }[];
            types?: string[];
            template?: string;
            context?: object;
        },
    ): Promise<T | null>;

    fromDropData<T extends ClientDocument>(this: ConstructorOf<T>, data: object, options?: object): Promise<T | null>;
}

export interface ToCompendiumOptions {
    /** Clear the currently assigned sort order */
    clearSort?: boolean;
    /** Clear the currently assigned folder */
    clearFolder?: boolean;
    /** Clear the flags object */
    clearFlags?: boolean;
    /** Clear any prior source information */
    clearSource?: boolean;
    /** Clear document ownership */
    clearOwnership?: boolean;
    /** Clear fields which store document state */
    clearState?: boolean;
    /** Retain the current Document id */
    keepId?: boolean;
}
