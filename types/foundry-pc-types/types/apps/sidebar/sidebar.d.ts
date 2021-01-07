/**
 * Render the Sidebar container, and after rendering insert Sidebar tabs
 */
declare class Sidebar extends Application {
    /** Sidebar application instance */
    apps: Application[];

    protected _collapsed: boolean;

    /**
     * Return the name of the active Sidebar tab
     */
    get activeTab(): string;

    /**
     * Return an Array of pop-out sidebar tab Application instances
     */
    get popouts(): Application[];

    /**
     * Activate a Sidebar tab by it's name
     * @param tabName      The tab name corresponding to it's "data-tab" attribute
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

    /**
     * Handle right-click events on tab controls to trigger pop-out containers for each tab
     * @param event     The originating contextmenu event
     */
    protected _onRightClickTab(event: Event): void;

    /**
     * Handle toggling of the Sidebar container's collapsed or expanded state
     * @param event
     * @private
     */
    protected _onToggleCollapse(event: Event): void;
}
