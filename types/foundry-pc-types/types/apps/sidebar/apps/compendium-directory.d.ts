declare type CompendiumDirectoryDefaultOptions = typeof Sidebar['defaultOptions'] & {
    id: string;
    template: string;
    title: string;
};

declare interface CompendiumDirectoryData {
    user: User;
    packs: {
        Actor: PackSummary;
        Item: PackSummary;
        JournalEntry: PackSummary;
        Macro: PackSummary;
        RollTable: PackSummary;
    };
}

declare interface PackSummaryData {
    options: ApplicationOptions;
    appId: number;
    metadata: CompendiumMetadata;
    locked: boolean;
    private: false;
    index: unknown[];
}

declare interface PackSummary {
    label: string;
    packs: PackSummaryData[];
}

declare class CompendiumDirectory extends SidebarTab {
    /** @override */
    static get defaultOptions(): CompendiumDirectoryDefaultOptions;

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
