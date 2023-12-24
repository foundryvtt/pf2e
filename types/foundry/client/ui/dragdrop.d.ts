export {};

declare global {
    /**
     * A controller class for managing drag and drop workflows within an Application instance.
     * The controller manages the following actions: dragstart, dragover, drop
     * @see {@link Application}
     *
     * @example
     * const dragDrop = new DragDrop({
     *   dragSelector: ".item",
     *   dropSelector: ".items",
     *   permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
     *   callbacks: { dragstart: this._onDragStart.bind(this), drop: this._onDragDrop.bind(this) }
     * });
     * dragDrop.bind(html);
     */
    class DragDrop {
        /** The HTML selector which identifies draggable elements */
        dragSelector: string;

        /** The HTML selector which identifies drop targets */
        dropSelector: string;

        /** A set of permission checking functions for each action of the Drag and Drop workflow */
        permissions: Record<string, DocumentOwnershipLevel>;

        /** A set of callback functions for each action of the Drag and Drop workflow */
        callbacks: Record<DragDropAction, (event: DragEvent) => unknown>;

        constructor({ dragSelector, dropSelector, permissions, callbacks }?: DragDropConfiguration);

        /**
         * Bind the DragDrop controller to an HTML application
         * @param html The HTML element to which the handler is bound
         */
        bind(html: HTMLElement): this;

        /**
         * Execute a callback function associated with a certain action in the workflow
         * @param event  The drag event being handled
         * @param action The action being attempted
         */
        callback(event: DragEvent, action: DragDropAction): (event: DragEvent) => unknown;

        /**
         * Test whether the current user has permission to perform a step of the workflow
         * @param action   The action being attempted
         * @param selector The selector being targeted
         * @return Can the action be performed?
         */
        can(action: DragDropAction, selector: string): boolean;

        /**
         * Handle the start of a drag workflow
         * @param event The drag event being handled
         */
        protected _handleDragStart(event: DragEvent): void;

        /**
         * Handle a dragged element over a droppable target
         * @param event The drag event being handled
         */
        protected _handleDragOver(event: DragEvent): void;

        /**
         * Handle a dragged element dropped on a droppable target
         * @param event The drag event being handled
         */
        protected _handleDrop(event: DragEvent): unknown;

        static createDragImage(img: ImageFilePath, width: number, height: number): HTMLDivElement;
    }

    interface DragDropConfiguration {
        /** The HTML selector which identifies draggable elements */
        dragSelector: string;

        /** The HTML selector which identifies drop targets */
        dropSelector: string;

        /** A set of permission checking functions for each action of the Drag and Drop workflow */
        permissions?: Record<string, DocumentOwnershipLevel>;

        /** A set of callback functions for each action of the Drag and Drop workflow */
        callbacks?: Partial<Record<DragDropAction, (event: DragEvent) => unknown>>;
    }
}

type DragDropAction = "dragstart" | "dragover" | "drop";
