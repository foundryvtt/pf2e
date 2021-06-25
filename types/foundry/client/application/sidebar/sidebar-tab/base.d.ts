declare interface SidebarTabOptions extends ApplicationOptions {
    filters: { inputSelector: string; contentSelector: string }[];
    renderUpdateKeys: string[];
}
declare type ContextOptionCondition = (li: JQuery) => boolean;
declare interface EntryContextOption {
    name: string;
    icon: string;
    condition: ContextOptionCondition;
    callback: (li: JQuery) => void;
}

/**
 * An abstract pattern followed by the different tabs of the sidebar
 */
declare abstract class SidebarTab extends Application<SidebarTabOptions> {
    /** @override */
    constructor(options?: SidebarTabOptions);

    /**
     * The base name of this sidebar tab
     */
    tabName: string;

    /**
     * A reference to the pop-out variant of this SidebarTab, if one exists
     */
    protected _popout: this;

    /**
     * Denote whether or not this is the original version of the sidebar tab, or a pop-out variant
     */
    protected _original: this;

    /**
     * Only close the pop-out version of the sidebar tab
     */
    close(): Promise<void>;

    /**
     * Get the set of ContextMenu options which should be used for Entities in a SidebarDirectory
     * @return The Array of context options passed to the ContextMenu instance
     */
    protected _getEntryContextOptions(): EntryContextOption[];
}
