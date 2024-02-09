import type { JournalEntryPageSource } from "../../../common/documents/journal-entry-page.d.ts";

declare global {
    /**
     * The Application responsible for displaying and editing a single JournalEntry document.
     * @param object The JournalEntry instance which is being edited
     * @param [options] Application options
     */
    class JournalSheet<TJournalEntry extends JournalEntry> extends DocumentSheet<TJournalEntry> {
        static override get defaultOptions(): DocumentSheetOptions;

        /**
         * The cached list of processed page entries.
         * This array is populated in the getData method.
         */
        protected _pages: JournalEntryPage<TJournalEntry>["_source"][];

        /**
         * Get the journal entry's current view mode.
         * @see {@link JournalSheet.VIEW_MODES}
         * @returns {number}
         */
        get mode(): JournalSheetViewMode;

        /** The current search mode for this journal */
        get searchMode(): DirectorySearchMode;

        /** Toggle the search mode for this journal between "name" and "full" text search */
        toggleSearchMode(): void;

        /** The pages that are currently scrolled into view and marked as 'active' in the sidebar. */
        get pagesInView(): HTMLElement[];

        /** The index of the currently viewed page. */
        get pageIndex(): number;

        /** The currently active IntersectionObserver. */
        get observer(): IntersectionObserver;

        /** Is the table-of-contents sidebar currently collapsed? */
        get sidebarCollapsed(): boolean;

        /** Available view modes for journal entries. */
        static VIEW_MODES: { SINGLE: 1; MULTIPLE: 2 };

        /**
         * The minimum amount of content that must be visible before the next page is marked as in view. Cannot be less than
         * 25% without also modifying the IntersectionObserver threshold.
         */
        static INTERSECTION_RATIO: number;

        /** Icons for page ownership. */
        static OWNERSHIP_ICONS: Record<DocumentOwnershipLevel, string | undefined>;

        get title(): string;

        protected override _getHeaderButtons(): ApplicationHeaderButton[];

        override getData(
            options?: Partial<DocumentSheetOptions>,
        ): JournalSheetData<TJournalEntry> | Promise<JournalSheetData<TJournalEntry>>;

        override get template(): string;

        /** Guess the default view mode for the sheet based on the player's permissions to the Entry */
        protected _inferDefaultMode(): string;

        protected override _render(force?: boolean, options?: JournalSheetRenderOptions): Promise<void>;

        protected override _getHeaderButtons(): ApplicationHeaderButton[];

        /**
         * Prepare pages for display.
         * @returns The sorted list of pages.
         */
        protected _getPageData(): JournalEntryPage<TJournalEntry>[];

        /**
         * Identify which page of the journal sheet should be currently rendered.
         * This can be controlled by options passed into the render method or by a subclass override.
         * @param options Sheet rendering options
         * @param [options.pageIndex] A numbered index of page to render
         * @param [options.pageId]    The ID of a page to render
         * @returns The currently displayed page index
         */
        protected _getCurrentPage(options?: { pageIndex?: number; pageId?: string }): number;

        override activateListeners(html: JQuery): void;

        /** Activate listeners after page content has been injected. */
        protected _activatePageListeners(): void;

        /**
         * @param [options.mode]       Render the sheet in a given view mode, see {@link JournalSheet.VIEW_MODES}.
         * @param [options.pageId]     Render the sheet with the page with the given ID in view.
         * @param [options.pageIndex]  Render the sheet with the page at the given index in view.
         * @param [options.anchor]     Render the sheet with the given anchor for the given page in view.
         * @param [options.tempOwnership] Whether the journal entry or one of its pages is being shown to players
         *                                who might otherwise not have permission to view it.
         * @param [options.collapsed] Render the sheet with the TOC sidebar collapsed?
         */
        protected override _render(force?: boolean, options?: JournalSheetRenderOptions): Promise<void>;

        /** Update child views inside the main sheet. */
        protected _renderPageViews(): Promise<void>;

        /**
         * Add headings to the table of contents for the given page node.
         * @param pageNode The HTML node of the page's rendered contents.
         * @param toc      The page's table of contents.
         */
        protected _renderHeadings(pageNode: HTMLElement, toc: Record<string, JournalEntryPageHeading>): void;

        /**
         * Create an intersection observer to maintain a list of headings that are in view. This is much more performant than
         * calling getBoundingClientRect on all headings whenever we want to determine this list.
         * @protected
         */
        protected _observeHeadings(): void;

        override close(options?: { force?: boolean }): Promise<void>;

        /**
         * Handle clicking the previous and next page buttons.
         * @param event  The button click event.
         */
        protected _onAction(event: JQuery.TriggeredEvent): void;

        /** Prompt the user with a Dialog for creation of a new JournalEntryPage */
        createPage(): Promise<JournalEntryPage<TJournalEntry> | null>;

        /** Turn to the previous page. */
        previousPage(): Promise<this> | void;

        /** Turn to the next page. */
        nextPage(): Promise<this> | void;

        /**
         * Turn to a specific page.
         * @param pageId   The ID of the page to turn to.
         * @param [anchor] Optionally an anchor slug to focus within that page.
         */
        goToPage(pageId: string, anchor?: string): void;

        /**
         * Retrieve the sheet instance for rendering this page inline.
         * @param pageId The ID of the page.
         */
        getPageSheet(pageId: string): JournalEntryPage<TJournalEntry> | undefined;

        /**
         * Determine whether a page is visible to the current user.
         * @param page  The page.
         */
        isPageVisible(page: JournalEntryPage<TJournalEntry>): boolean;

        /** Toggle the collapsed or expanded state of the Journal Entry table-of-contents sidebar. */
        toggleSidebar(): void;

        /** Update the disabled state of the previous and next page buttons. */
        protected _updateButtonState(): void;

        /**
         * Edit one of this JournalEntry's JournalEntryPages.
         * @param event  The originating page edit event.
         */
        protected _onEditPage(event: JQuery.TriggeredEvent): Promise<this> | undefined;

        /**
         * Handle clicking an entry in the sidebar to scroll that heading into view.
         * @param event The originating click event.
         */
        protected _onClickPageLink(event: JQuery.TriggeredEvent): void;

        /**
         * Handle clicking an image to pop it out for fullscreen view.
         * @param event The click event.
         */
        protected _onClickImage(event: MouseEvent): void;

        /**
         * Handle new pages scrolling into view.
         * @param entries  An Array of elements that have scrolled into or out of view.
         * @param observer The IntersectionObserver that invoked this callback.
         */
        protected _onPageScroll(entries: IntersectionObserverEntry[], observer: IntersectionObserver): void;

        /** Highlights the currently viewed page in the sidebar. */
        protected _activatePagesInView(): void;

        /**
         * If the set of active pages has changed, various elements in the sidebar will expand and collapse. For particularly
         * long ToCs, this can leave the scroll position of the sidebar in a seemingly random state. We try to do our best to
         * sync the sidebar scroll position with the current journal viewport.
         */
        protected _synchronizeSidebar(): void;

        protected _contextMenu(html: JQuery): void;

        /**
         * Handle opening the context menu.
         * @param target The element the context menu has been triggered for.
         */
        protected _onContextMenuOpen(target: HTMLElement): void;

        /**
         * Handle closing the context menu.
         * @param target The element the context menu has been triggered for.
         */
        protected _onContextMenuClose(target: HTMLElement): void;

        /**
         * Get the set of ContextMenu options which should be used for JournalEntryPages in the sidebar.
         * @returns {ContextMenuEntry[]}  The Array of context options passed to the ContextMenu instance.
         */
        protected _getEntryContextOptions(): ContextMenuEntry[];

        protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

        /**
         * Handle requests to show the referenced Journal Entry to other Users
         * Save the form before triggering the show request, in case content has changed
         * @param event The triggering click event
         */
        protected _onShowPlayers(event: Event): Promise<void>;

        protected override _canDragStart(selector: string): boolean;

        protected override _canDragDrop(selector: string): boolean;

        protected override _onDragStart(event: DragEvent): void;

        protected override _onDrop(event: DragEvent): Promise<void>;

        protected override _onSearchFilter(
            event: KeyboardEvent,
            query: string,
            rgx: RegExp,
            html: HTMLElement | null,
        ): void;
    }

    type JournalSheetViewMode = (typeof JournalSheet.VIEW_MODES)[keyof typeof JournalSheet.VIEW_MODES];

    interface JournalSheetRenderOptions extends DocumentRenderOptions {
        pageId?: string;
        pageIndex?: number;
    }

    interface JournalSheetData<TDocument extends JournalEntry> extends DocumentSheetData<TDocument> {
        collapseMode: {
            label: string;
            icon: string;
        };
        searchIcon: string;
        searchTooltip: string;
        toc: JournalSheetPageData[];
    }

    interface JournalSheetPageData extends JournalEntryPageSource {
        number: 0;
        ownershipCls: string;
    }
}
