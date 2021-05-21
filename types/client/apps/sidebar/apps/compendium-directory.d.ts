declare interface CompendiumDirectoryOptions extends SidebarTabOptions {
    id: string;
    template: string;
    title: string;
}

declare type PackSummaryByEntity = Record<CompendiumDocumentString, PackSummary>;

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
    label: CompendiumDocumentString;
    packs: PackSummaryData[];
}

declare class CompendiumDirectory extends SidebarTab {
    /** @override */
    static get defaultOptions(): CompendiumDirectoryOptions;

    /** @override */
    getData(options?: {}): CompendiumDirectoryData;

    /**
     * Compendium sidebar Context Menu creation
     * @param html {jQuery}
     */
    protected _contextMenu(html: JQuery): void;

    /**
     * Get the sidebar directory entry context options
     * @return The sidebar entry context options
     */
    protected _getEntryContextOptions(): EntryContextOption[];

    /**
     * Handle a Compendium Pack creation request
     * @param event
     */
    protected _onCreateCompendium(event: JQuery.Event): Promise<boolean>;

    /**
     * Handle a Compendium Pack deletion request
     * @param pack The pack object requested for deletion
     */
    protected _onDeleteCompendium(pack: Compendium): Promise<boolean>;

    /** @override */
    protected _onSearchFilter(event: Event, query: string, html: HTMLElement): void;
}

declare interface CompendiumDirectory {
    options: CompendiumDirectoryOptions;
}
