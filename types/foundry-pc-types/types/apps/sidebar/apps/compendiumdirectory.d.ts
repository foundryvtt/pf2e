declare interface EntryContextOption {
    name: string;
    icon: string;
    callback: (li: JQuery<HTMLLIElement>) => Promise<boolean>;
}

declare class CompendiumDirectory extends SidebarTab {
    /** @override */
    static get defaultOptions(): typeof SidebarTab['defaultOptions'] & {
        id: string;
        template: string;
        title: string;
    };

    /** @override */
    getData(options?: {}): {
        user: User;
        packs: { label: string; packs: Compendium[] };
    };

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
