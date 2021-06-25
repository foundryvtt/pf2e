declare class Hotbar extends Application {
    /** @override */
    constructor(options: ApplicationOptions);

    /** @override */
    static get defaultOptions(): ApplicationOptions;

    /** @override */
    getData(options?: {}): {
        page: string;
        macros: string;
        barClass: string;
    };

    /**
     * Get the Array of Macro (or null) values that should be displayed on a numbered page of the bar
     * @param page
     */
    protected _getMacrosByPage(page: number): Macro[];

    /**
     * Collapse the Hotbar, minimizing its display.
     * @return A promise which resolves once the collapse animation completes
     */
    collapse(): Promise<void>;

    /**
     * Expand the Hotbar, displaying it normally.
     * @return A promise which resolves once the expand animation completes
     */
    expand(): Promise<void>;

    /**
     * Change to a specific numbered page from 1 to 5
     * @param page The page number to change to.
     */
    changePage(page: number): void;

    /**
     * Change the page of the hotbar by cycling up (positive) or down (negative)
     * @param direction The direction to cycle
     */
    cyclePage(direction: number): void;

    /** @override */
    activateListeners(html: JQuery): void;

    /**
     * Create a Context Menu attached to each Macro button
     * @param html
     */
    protected _contextMenu(html: JQuery): void;

    /**
     * Handle left-click events to
     * @param event
     */
    protected _onClickMacro(event: Event): Promise<void>;

    /**
     * Handle hover events on a macro button to track which slot is the hover target
     * @param event The originating mouseover or mouseleave event
     */
    protected _onHoverMacro(event: Event): void;

    /**
     * Handle pagination controls
     * @param event   The originating click event
     */
    protected _onClickPageControl(event: Event): void;

    /** @override */
    protected _canDragStart(selector: string): boolean;

    /** @override */
    protected _onDragStart(event: ElementDragEvent): void;

    /** @override */
    protected _canDragDrop(selector: string): boolean;

    /** @override */
    _onDrop(event: Event): Promise<void>;

    /**
     * Get the Macro entity being dropped in the Hotbar. If the data comes from a non-World source, create the Macro
     * @param data The data transfer attached to the DragEvent
     * @return A Promise which returns the dropped Macro, or null
     */
    protected _getDropMacro(data: unknown): Promise<Macro | null>;

    /**
     * Handle click events to toggle display of the macro bar
     * @param event
     */
    protected _onToggleBar(event: Event): void;
}
