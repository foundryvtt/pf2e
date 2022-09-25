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

    override getData(options?: Partial<ApplicationOptions>): Promise<CompendiumDirectoryData>;

    /** Compendium sidebar Context Menu creation */
    protected _contextMenu(html: JQuery): void;

    /**
     * Get the sidebar directory entry context options
     * @return The sidebar entry context options
     */
    protected override _getEntryContextOptions(): EntryContextOption[];

    /**
     * Handle a Compendium Pack creation request
     * @param event
     */
    protected _onCreateCompendium(event: JQuery.Event): Promise<boolean>;

    /**
     * Handle a Compendium Pack deletion request
     * @param pack The pack object requested for deletion
     */
    protected _onDeleteCompendium(pack: CompendiumCollection): Promise<boolean>;

    protected override _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;
}
