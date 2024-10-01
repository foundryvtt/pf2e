export {};

declare global {
    /**
     * The global action bar displayed at the bottom of the game view.
     * The Hotbar is a UI element at the bottom of the screen which contains Macros as interactive buttons.
     * The Hotbar supports 5 pages of global macros which can be dragged and dropped to organize as you wish.
     *
     * Left clicking a Macro button triggers its effect.
     * Right clicking the button displays a context menu of Macro options.
     * The number keys 1 through 0 activate numbered hotbar slots.
     * Pressing the delete key while hovering over a Macro will remove it from the bar.
     *
     * @extends {Application}
     *
     * @see {@link Macros}
     * @see {@link Macro}
     */
    class Hotbar<TMacro extends Macro = Macro> extends Application {
        constructor(options: ApplicationOptions);

        /** The currently viewed macro page */
        page: number;

        /** The currently displayed set of macros */
        macros: TMacro[];

        /** Track collapsed state */
        protected _collapsed: false;

        /** Track which hotbar slot is the current hover target, if any */
        protected _hover: number | null;

        static override get defaultOptions(): ApplicationOptions;

        override getData(options?: Record<string, unknown>): {
            page: number;
            macros: TMacro[];
            barClass: string;
        };

        /**
         * Get the Array of Macro (or null) values that should be displayed on a numbered page of the bar
         * @param page
         */
        protected _getMacrosByPage(page: number): TMacro[];

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

        override activateListeners(html: JQuery): void;

        /**
         * Create a Context Menu attached to each Macro button
         * @param html
         */
        protected _contextMenu(html: JQuery): void;

        /** Get the Macro entry context options */
        protected _getEntryContextOptions(): EntryContextOption[];

        /** Handle left-click events to */
        protected _onClickMacro(event: MouseEvent): Promise<void>;

        /**
         * Handle hover events on a macro button to track which slot is the hover target
         * @param event The originating mouseover or mouseleave event
         */
        protected _onHoverMacro(event: MouseEvent): void;

        /**
         * Handle pagination controls
         * @param event   The originating click event
         */
        protected _onClickPageControl(event: MouseEvent): void;

        protected override _canDragStart(selector: string): boolean;

        protected override _onDragStart(event: DragEvent): void;

        protected override _canDragDrop(selector: string): boolean;

        protected override _onDrop(event: DragEvent): Promise<void>;

        /**
         * Get the Macro entity being dropped in the Hotbar. If the data comes from a non-World source, create the Macro
         * @param data The data transfer attached to the DragEvent
         * @return A Promise which returns the dropped Macro, or null
         */
        protected _getDropMacro(data: unknown): Promise<TMacro | null>;

        /**
         * Handle click events to toggle display of the macro bar
         * @param event
         */
        protected _onToggleBar(event: Event): void;
    }
}
