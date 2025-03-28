import type Document from "../../../common/abstract/document.d.ts";
import type { ApplicationConfiguration, ApplicationRenderContext } from "../_types.d.ts";
import type HandlebarsApplicationMixin from "../api/handlebars-application.ts";
import type { HandlebarsRenderOptions, HandlebarsTemplatePart } from "../api/handlebars-application.ts";
import type AbstractSidebarTab from "./sidebar-tab.d.mts";

export interface DocumentDirectoryConfiguration extends ApplicationConfiguration {
    /** The Document collection that this directory represents. */
    collection: DirectoryCollection;
    /** Updating one of these properties of a displayed Document will trigger a re-render of the tab. */
    renderUpdateKeys: string[];
}

/**
 * An abstract class for rendering a foldered directory of Documents.
 * @template {ClientDocument} TDocument
 * @mixes HandlebarsApplication
 * @alias DocumentDirectory
 */
export default class DocumentDirectory<TDocument extends Document<null>> extends HandlebarsApplicationMixin(
    AbstractSidebarTab<DocumentDirectoryConfiguration, HandlebarsRenderOptions>,
) {
    constructor(options: Partial<DocumentDirectoryConfiguration>);

    static override DEFAULT_OPTIONS: Partial<DocumentDirectoryConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** The path to the template used to render a single entry within the directory. */
    protected static _entryPartial: string;

    /** The path to the template used to render a single folder within the directory. */
    protected static _folderPartial: string;

    /** The Document collection that this directory represents. */
    get collection(): DirectoryCollection;

    /** The implementation of the Document type that this directory represents. */
    get documentClass(): ConstructorOf<TDocument>;

    /** The named Document type that this directory represents. */
    get documentName(): TDocument["documentName"];

    override get title(): string;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** Determine if the current user has permission to create directory entries. */
    protected _canCreateEntry(): boolean;

    /** Determine if the current user has permission to create folders in this directory. */
    protected _canCreateFolder(): boolean;

    protected override _canRender(options: HandlebarsRenderOptions): false | void;

    protected override _configureRenderParts(options: HandlebarsRenderOptions): Record<string, HandlebarsTemplatePart>;

    /** Get context menu entries for entries in this directory. */
    protected _getEntryContextOptions(): ContextMenuEntry[];

    /** Get context menu entries for folders in this directory. */
    protected _getFolderContextOptions(): ContextMenuEntry[];

    protected override _onFirstRender(context: object, options: HandlebarsRenderOptions): Promise<void>;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<object>;

    protected override _preparePartContext(
        partId: string,
        context: object,
        options: HandlebarsRenderOptions,
    ): Promise<object>;

    /** Prepare render context for the directory part. */
    protected _prepareDirectoryContext(context: object, options: HandlebarsRenderOptions): Promise<void>;

    /** Prepare render context for the footer part. */
    protected _prepareFooterContext(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    /**
     * Prepare render context for the header part.
     * @param {ApplicationRenderContext} context
     * @param {HandlebarsRenderOptions} options
     * @returns {Promise<void>}
     * @protected
     */
    protected _prepareHeaderContext(context: object, options: HandlebarsRenderOptions): Promise<void>;

    protected override _preRender(context: object, options: HandlebarsRenderOptions): Promise<void>;

    protected override _preSyncPartState(
        partId: string,
        newElement: HTMLElement,
        priorElement: HTMLElement,
        state: object,
    ): void;

    protected override _syncPartState(
        partId: string,
        newElement: HTMLElement,
        priorElement: HTMLElement,
        state: object,
    ): void;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
     * Handle activating a directory entry.
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The action target element.
     * @param {object} [options]
     * @param {boolean} [options._skipDeprecation] Internal use only.
     * @returns {Promise<void>}
     * @protected
     */
    protected _onClickEntry(
        event: PointerEvent,
        target: HTMLElement,
        { _skipDeprecation }?: { _skipDeprecation?: boolean },
    ): Promise<void>;

    /**
     * Handle creating a new entry in this directory.
     * @param event  The triggering click event.
     * @param target The action target element.
     */
    protected _onCreateEntry(event: PointerEvent, target: HTMLElement): Promise<Document | undefined>;

    /**
     * Handle creating a new folder in this directory.
     * @param event  The triggering click event.
     * @param target The action target element.
     */
    protected _onCreateFolder(event: PointerEvent, target: HTMLElement): void;

    /**
     * Handle toggling a folder's expanded state.
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The action target element.
     * @param {object} [options]
     * @param {boolean} [options._skipDeprecation] Internal use only.
     * @protected
     */
    protected _onToggleFolder(
        event: PointerEvent,
        target: HTMLElement,
        { _skipDeprecation }?: { _skipDeprecation?: boolean },
    ): void;

    /* -------------------------------------------- */
    /*  Search & Filter                             */
    /* -------------------------------------------- */

    /**
     * Handle directory searching and filtering.
     * @param event The keyboard input event.
     * @param query The input search string.
     * @param rgx   The regular expression query that should be matched against.
     * @param html  The container to filter entries from.
     */
    protected _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;

    /**
     * Identify entries in the collection which match a provided search query.
     * @param query              The search query.
     * @param entryIds      The set of matched entry IDs.
     * @param folderIds     The set of matched folder IDs.
     * @param autoExpandIds The set of folder IDs that should be auto-expanded.
     */
    protected _matchSearchEntries(
        query: RegExp,
        entryIds: Set<string>,
        folderIds: Set<string>,
        autoExpandIds: Set<string>,
    ): void;

    /**
     * Identify folders in the collection which match a provided search query.
     * @param query         The search query.
     * @param folderIds     The set of matched folder IDs.
     * @param autoExpandIds The set of folder IDs that should be auto-expanded.
     */
    protected _matchSearchFolders(query: RegExp, folderIds: Set<string>, autoExpandIds: Set<string>): void;

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    protected _canDragDrop(selector: string): boolean;

    protected _canDragStart(selector: string): boolean;

    /**
     * Create a new entry in this directory from one that was dropped on it.
     * @param entry     The dropped entry.
     * @param [updates] Modifications to the creation data.
     */
    protected _createDroppedEntry(entry: DirectoryMixinEntry, updates?: object): Promise<TDocument | undefined>;

    /**
     * Import a dropped folder and its children into this collection if they do not already exist.
     * @param folder         The folder being dropped.
     * @param [targetFolder] A folder to import into if not the directory root.
     */
    protected _createDroppedFolderContent(folder: Folder, targetFolder?: Folder): Promise<Folder[]>;

    /**
     * Create a set of documents in a dropped folder.
     * @param folder    The dropped folder.
     * @param documents The documents to create, or their indices.
     */
    protected _createDroppedFolderDocuments(
        folder: Folder,
        documents: TDocument[] | CompendiumIndexData[],
    ): Promise<void>;

    /**
     * Determing whether a given directory entry belongs to the given folder.
     * @param entry  The entry.
     * @param folder The target folder ID.
     */
    protected _entryBelongsToFolder(entry: DirectoryMixinEntry, folder: string): boolean;

    /**
     * Get drag data for an entry in this directory.
     * @param entryId The entry's ID.
     */
    protected _getEntryDragData(entryId: string): DropCanvasData;

    /**
     * Get drag data for a folder in this directory.
     * @param folderId The folder ID.
     */
    protected _getFolderDragData(folderId: string): DropCanvasData;

    /**
     * Handle dropping a new entry into this directory.
     * @param target The drop target element.
     * @param data   The drop data.
     */
    protected _handleDroppedEntry(target: HTMLElement, data: object): Promise<void>;

    /**
     * Handle dropping a folder onto the directory.
     * @param target The drop target element.
     * @param data   The drop data.
     */
    protected _handleDroppedFolder(target: HTMLElement, data: DropCanvasData): Promise<void>;

    /**
     * Handle importing a new folder's into the directory.
     * @param folder          The dropped folder.
     * @param closestFolderId The ID of the closest folder to the drop target.
     * @param sortData        Sort data for the folder.
     */
    protected _handleDroppedForeignFolder(
        folder: Folder,
        closestFolderId: string,
        sortData: object,
    ): Promise<{ folder: Folder; sortNeeded: boolean } | null>;

    /**
     * Highlight folders as drop targets when a drag event enters or exits their area.
     * @param event The in-progress drag event.
     */
    protected _onDragHighlight(event: DragEvent): void;

    protected _onDragStart(event: DragEvent): void;

    protected _onDrop(event: DragEvent): void;

    /**
     * Organize a dropped folder and its children into a list of folders and documents to create.
     * @param folder The dropped folder.
     * @param [targetFolder] A folder to import into if not the directory root.
     */
    protected _organizeDroppedFoldersAndDocuments(
        folder: Folder,
        targetFolder?: Folder,
    ): Promise<{ foldersToCreate: Folder[]; documentsToCreate: TDocument[] | object[] }>;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /** Collapse all open folders in this directory. */
    collapseAll(): void;
}
