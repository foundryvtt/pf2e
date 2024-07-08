/** Render the Sidebar container, and after rendering insert Sidebar tabs */
declare class Sidebar extends Application {
    /** Singleton application instances for each sidebar tab */
    tabs: Tabs;

    /** Track whether the sidebar container is currently collapsed */
    _collapsed: boolean;

    /**
     * Return an Array of pop-out sidebar tab Application instances
     */
    get popouts(): Application[];

    /**
     * Return the name of the active Sidebar tab
     */
    get activeTab(): string;

    /**
     * Activate a Sidebar tab by it's name
     * @param tabName   The tab name corresponding to it's "data-tab" attribute
     */
    activateTab(tabName: string): void;

    /**
     * Expand the Sidebar container from a collapsed state.
     * Take no action if the sidebar is already expanded.
     */
    expand(): void;

    /**
     * Collapse the sidebar to a minimized state.
     * Take no action if the sidebar is already collapsed.
     */
    collapse(): void;
}
