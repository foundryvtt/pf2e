declare type PackSummaryByEntity = Record<CompendiumDocumentType, PackSummary>;

declare interface CompendiumDirectoryData {
    user: User;
    packs: PackSummaryByEntity;
}

declare interface PackSummaryData {
    options: ApplicationOptions;
    appId: number;
    metadata: CompendiumMetadata;
    locked: boolean;
    private: boolean;
    index: unknown[];
}

declare interface PackSummary {
    label: CompendiumDocumentType;
    packs: PackSummaryData[];
}

declare class CompendiumDirectory extends SidebarTab {
    static override get defaultOptions(): ApplicationOptions;

    /** A reference to the currently active compendium types. If empty, all types are shown. */
    get activeFilters(): CompendiumDocumentType[];

    entryType: "Compendium";

    entryPartial: string;

    protected _entryAlreadyExists(entry: CompendiumIndexData | CompendiumDocument): boolean;

    protected _getEntryDragData(entryId: string): { type: "Compendium"; id: string };

    protected _entryIsSelf(
        entry: CompendiumIndexData | CompendiumDocument,
        otherEntry: CompendiumIndexData | CompendiumDocument,
    ): boolean;

    /**
     * Sort a relative entry within a collection
     * @param entry               The entry to sort
     * @param sortData            The sort data
     * @param sortData.sortKey    The sort key to use for sorting
     * @param sortData.sortBefore Sort before the target?
     * @param sortData.updateData Additional data to update on the entry
     * @returns The sorted entry
     */
    protected _sortRelative<TEntry extends CompendiumIndexData | CompendiumDocument>(
        entry: TEntry,
        sortData: { sortKey: string; sortBefore: boolean; updateData: Record<string, unknown> },
    ): Promise<TEntry>;

    override activateListeners(html: JQuery): void;

    override getData(options?: Partial<ApplicationOptions>): Promise<CompendiumDirectoryData>;

    /** Compendium sidebar Context Menu creation */
    protected _contextMenu(html: JQuery): void;

    /**
     * Get the sidebar directory entry context options
     * @return The sidebar entry context options
     */
    protected override _getEntryContextOptions(): EntryContextOption[];

    /** Handle a Compendium Pack creation request */
    protected _onCreateCompendium(event: JQuery.Event): Promise<boolean>;

    /**
     * Handle a Compendium Pack deletion request
     * @param pack The pack object requested for deletion
     */
    protected _onDeleteCompendium(pack: CompendiumCollection): Promise<boolean>;

    protected override _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;
}
