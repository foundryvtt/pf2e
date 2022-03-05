export {};

declare global {
    /**
     * A CanvasLayer for displaying UI controls which are overlayed on top of other layers.
     *
     * We track three types of events:
     * 1) Cursor movement
     * 2) Ruler measurement
     * 3) Map pings
     */
    class ControlsLayer extends CanvasLayer {
        constructor();

        /** A container of DoorControl instances */
        doors: DoorContainer;

        /** A container of HUD interface elements */
        hud: PIXI.Container;

        /**
         * A container of cursor interaction elements.
         * Contains cursors, rulers, interaction rectangles, and pings
         */
        cursors: PIXI.Container;

        /** Ruler tools, one per connected user */
        rulers: PIXI.Container;

        /** A graphics instance used for drawing debugging visualization */
        debug: PIXI.Container;

        /** The Canvas selection rectangle */
        select: PIXI.Graphics;

        /** A mapping of user IDs to Cursor instances for quick access */
        protected _cursors: Record<string, object>;

        /** A mapping of user IDs to Ruler instances for quick access */
        protected _rulers: Record<string, Ruler>;

        static override get layerOptions(): PlaceablesLayerOptions;

        /** A convenience accessor to the Ruler for the active game user */
        get ruler(): Ruler | null;

        /** Get the Ruler display for a specific User ID */
        getRulerForUser(userId: string): Ruler | null;

        override draw(): Promise<this>;

        override tearDown(): Promise<void>;

        /** Draw the cursors container */
        drawCursors(): void;

        /** Draw Ruler tools */
        drawRulers(): void;

        /**
         * Draw the select rectangle given an event originated within the base canvas layer
         * @param coords The rectangle coordinates of the form {x, y, width, height}
         */
        drawSelect({ x, y, width, height }: { x: number; y: number; width: number; height: number }): void;

        override deactivate(): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /** Handle mousemove events on the game canvas to broadcast activity of the user's cursor position */
        protected _onMouseMove(event: PIXI.InteractionEvent): void;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Create and draw the Cursor object for a given User
         * @param user The User document for whom to draw the cursor Container
         */
        drawCursor(user: User): object;

        /**
         * Update the cursor when the user moves to a new position
         * @param user     The User for whom to update the cursor
         * @param position The new cursor position
         */
        updateCursor(user: User, position: Point): void;

        /**
         * Update display of an active Ruler object for a user given provided data
         * @param user      The User for whom to update the ruler
         * @param rulerData Data which describes the new ruler measurement to display
         */
        updateRuler(user: User, rulerData: object): void;
    }
}

interface DoorContainer extends PIXI.Container {
    children: DoorControl[];
}
