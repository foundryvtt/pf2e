import { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_types.mjs";
import { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import { CompendiumDocument } from "@client/documents/_module.mjs";
import CompendiumCollection, { CompendiumIndexData } from "@client/documents/collections/compendium-collection.mjs";
import { DropCanvasData } from "@client/helpers/hooks.mjs";
import { HandlebarsApplicationMixin, HandlebarsRenderOptions, HandlebarsTemplatePart } from "../../api/_module.mjs";
import AbstractSidebarTab from "../sidebar-tab.mjs";

export interface CompendiumPackDirectoryContext {
    /** Whether the pack is locked. */
    locked: boolean;
    /** Whether the pack has custom ownership configured. */
    customOwnership: boolean;
    /** The pack's collection ID. */
    collection: string;
    /** The name of the package the pack belongs to. */
    package: string;
    /** The pack title. */
    title: string;
    /** An icon representing the pack's contents. */
    icon: string;
    /** Whether the pack is currently hidden. */
    hidden: boolean;
    /** The pack's banner image. */
    banner: string;
    /** An icon representing the pack's source (World, System, or Module). */
    sourceIcon: string;
    /** CSS class names. */
    css: string;
}

export default class CompendiumDirectory extends HandlebarsApplicationMixin(AbstractSidebarTab) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    static override tabName: "compendium";

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The set of active document type filters.
     */
    get activeFilters(): Set<string>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Get context menu entries for entries in this directory.
     */
    protected _getEntryContextOptions(): ContextMenuEntry[];

    /**
     * Get options for filtering the directory by document type.
     */
    protected _getFilterContextOptions(): ContextMenuEntry[];

    /**
     * Get context menu entries for folders in this directory.
     */
    protected _getFolderContextOptions(): ContextMenuEntry[];

    protected override _onFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    protected override _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<ApplicationRenderContext>;

    protected override _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<ApplicationRenderContext>;

    /**
     * Prepare render context for the directory part.
     */
    protected _prepareDirectoryContext(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    /**
     * Prepare render context for the header part.
     */
    protected _prepareHeaderContext(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    /**
     * Prepare render context for an individual compendium pack.
     * @param pack The compendium pack.
     */
    protected _preparePackContext(pack: CompendiumCollection): CompendiumPackDirectoryContext;

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
    /*  Public API                                  */
    /* -------------------------------------------- */

    collapseAll(): void;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
     * Handle clicking on a compendium entry.
     * @param event The triggering event.
     * @param target The action target.
     */
    protected _onClickEntry(event: PointerEvent, target: HTMLElement): void;

    /**
     * Handle creating a new compendium pack.
     * @param event The triggering event.
     * @param target The action target.
     */
    protected _onCreateEntry(event: PointerEvent, target: HTMLElement): Promise<void>;

    /**
     * Handle creating a new folder in this directory.
     * @param event The triggering click event.
     * @param target The action target element.
     */
    protected _onCreateFolder(event: PointerEvent, target: HTMLElement): void;

    /**
     * Handle deleting a compendium pack.
     * @param li The compendium target element.
     */
    protected _onDeleteCompendium(li: HTMLElement): Promise<void>;

    /**
     * Handle duplicating a compendium.
     * @param li The compendium target element.
     */
    protected _onDuplicateCompendium(li: HTMLElement): Promise<CompendiumCollection | void>;

    /**
     * Handle toggling a compendium type filter.
     * @param event The triggering event.
     * @param type The compendium type to filter by. If omitted, clear all filters.
     */
    protected _onToggleCompendiumFilterType(event: PointerEvent, type?: string): Promise<this>;

    /**
     * Handle toggling a folder's expanded state.
     * @param event The triggering click event.
     * @param target The action target element.
     */
    protected _onToggleFolder(event: PointerEvent, target: HTMLElement): void;

    /**
     * Handle toggling locked state on a compendium.
     * @param li The compendium target element.
     */
    protected _onToggleLock(li: HTMLElement): Promise<boolean | void>;

    /* -------------------------------------------- */
    /*  Search & Filter                             */
    /* -------------------------------------------- */

    /**
     * Handle matching a given directory entry with the search filter.
     * @param query The input search string.
     * @param packs The matched pack IDs.
     * @param element The candidate entry element.
     * @param options Additional options for subclass-specific behavior.
     */
    protected _onMatchSearchEntry(query: string, packs: Set<string>, element: HTMLElement, options?: object): void;

    /**
     * Handle directory searching and filtering.
     * @param event The keyboard input event.
     * @param query The input search string.
     * @param rgx The regular expression query that should be matched against.
     * @param html The container to filter entries from.
     */
    protected _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;

    /**
     * Identify entries in the collection which match a provided search query.
     * @param query The search query.
     * @param packs The set of matched pack IDs.
     * @param folderIds The set of matched folder IDs.
     * @param autoExpandIds The set of folder IDs that should be auto-expanded.
     * @param options Additional options for subclass-specific behavior.
     */
    protected _matchSearchEntries(
        query: RegExp,
        packs: Set<string>,
        folderIds: Set<string>,
        autoExpandIds: Set<string>,
        options?: object,
    ): void;

    /**
     * Identify folders in the collection which match a provided search query.
     * @param {RegExp} query               The search query.
     * @param {Set<string>} folderIds      The set of matched folder IDs.
     * @param {Set<string>} autoExpandIds  The set of folder IDs that should be auto-expanded.
     * @param {object} [options]           Additional options for subclass-specific behavior.
     * @protected
     */
    protected _matchSearchFolders(
        query: RegExp,
        folderIds: Set<string>,
        autoExpandIds: Set<string>,
        options?: object,
    ): void;

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    /**
     * Determine if the given user has permission to drop entries into the compendium directory.
     * @param selector The CSS selector of the dragged element.
     */
    protected _canDragDrop(selector: string): boolean;

    /**
     * Determine if the given user has permission to drag packs and folders in the directory.
     * @param selector The CSS selector of the target element.
     */
    protected _canDragStart(selector: string): boolean;

    /**
     * Test if the given pack is already present in this directory.
     * @param pack The compendium pack.
     */
    protected _entryAlreadyExists(pack: CompendiumCollection): boolean;

    /**
     * Determine whether a given directory entry belongs to the given folder.
     * @param pack The compendium pack.
     * @param folder The target folder ID.
     */
    protected _entryBelongsToFolder(pack: CompendiumCollection, folder: string | undefined): boolean;

    /**
     * Get the pack instance from its dropped data.
     * @param data The drag data.
     */
    protected _getDroppedEntryFromData(data: DropCanvasData): Promise<CompendiumCollection>;

    /**
     * Get drag data for a compendium in this directory.
     * @param collection The pack's collection ID.
     */
    protected _getEntryDragData(collection: string): { collection: string; type: "Compendium" };

    /**
     * Get drag data for a folder in this directory.
     * @param folderId The folder ID.
     */
    protected _getFolderDragData(folderId: string): DropCanvasData;

    /**
     * Handle dropping a new pack into this directory.
     * @param target The drop target element.
     * @param data The drop data.
     */
    protected _handleDroppedEntry(target: HTMLElement, data: DropCanvasData): Promise<void>;

    /**
     * Handle dropping a folder onto the directory.
     * @param target The drop target element.
     * @param data The drop data.
     */
    protected _handleDroppedFolder(target: HTMLElement, data: DropCanvasData): Promise<void>;

    /**
     * Highlight folders as drop targets when a drag event enters or exits their area.
     * @param event The in-progress drag event.
     */
    protected _onDragHighlight(event: DragEvent): void;

    /**
     * Handle drag events over the directory.
     */
    protected _onDragOver(event: DragEvent): void;

    protected _onDragStart(event: DragEvent): void;

    protected _onDrop(event: DragEvent): Promise<void>;

    /**
     * Handle sorting a compendium pack relative to others in the directory.
     * @param pack The compendium pack.
     * @param sortData Sort data.
     */
    protected _sortRelative(
        pack: CompendiumIndexData | CompendiumDocument,
        sortData: { sortKey: string; sortBefore: boolean; updateData: Record<string, unknown> },
    ): void;
}
