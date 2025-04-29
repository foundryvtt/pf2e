type DragAction = "dragstart" | "dragover" | "drop" | "dragenter" | "dragleave" | "dragend";

interface DragDropConfiguration {
    /** The CSS selector used to target draggable elements. */
    dragSelector: string | null;
    /** The CSS selector used to target viable drop targets. */
    dropSelector: string | null;
    /** Permission tests for each action */
    permissions: Record<"dragstart" | "drop", (selector: string) => boolean>;
    /** Callback functions for each action */
    callbacks: Partial<Record<DragAction, (event: DragEvent) => void>>;
}

/**
 * A controller class for managing drag and drop workflows within an Application instance.
 * The controller manages the following actions: dragstart, dragover, drop.
 *
 * @example Activate drag-and-drop handling for a certain set of elements
 * ```js
 * const dragDrop = new DragDrop({
 *   dragSelector: ".item",
 *   dropSelector: ".items",
 *   permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
 *   callbacks: { dragstart: this._onDragStart.bind(this), drop: this._onDragDrop.bind(this) }
 * });
 * dragDrop.bind(html);
 * ```
 */
export default class DragDrop {
    constructor(config?: Partial<DragDropConfiguration>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A set of callback functions for each action of the drag & drop workflow.  */
    callbacks: DragDropConfiguration["callbacks"];

    /** The HTML selector which identifies draggable elements. */
    dragSelector: DragDropConfiguration["dragSelector"];

    /** The HTML selector which identifies drop targets. */
    dropSelector: DragDropConfiguration["dropSelector"];

    /** A set of functions to control authorization to begin drag workflows, and drop content. */
    permissions: DragDropConfiguration["permissions"];

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Bind the DragDrop controller to an HTML application
     * @param html  The HTML element to which the handler is bound
     */
    bind(html: HTMLElement): this;

    /**
     * Execute a callback function associated with a certain action in the workflow
     * @param event   The drag event being handled
     * @param action  The action being attempted
     */
    callback(event: DragEvent, action: DragAction): ((event: DragEvent) => void) | void;

    /**
     * Test whether the current user has permission to perform a step of the workflow
     * @param action     The action being attempted
     * @param selector   The selector being targeted
     * @returns Can the action be performed?
     */
    can(action: DragAction, selector: string): boolean;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle the start of a drag workflow
     * @param event The drag event being handled
     */
    protected _handleDragStart(event: DragEvent): void;

    /**
     * Handle a drag workflow ending for any reason.
     * @param event  The drag event.
     */
    protected _handleDragEnd(event: DragEvent): void;

    /**
     * Handle entering a drop target while dragging.
     * @param event  The drag event.
     */
    protected _handleDragEnter(event: DragEvent): void;

    /**
     * Handle leaving a drop target while dragging.
     * @param event  The drag event.
     */
    protected _handleDragLeave(event: DragEvent): void;

    /**
     * Handle a dragged element over a droppable target
     * @param event  The drag event being handled
     */
    protected _handleDragOver(event: DragEvent): boolean;

    /**
     * Handle a dragged element dropped on a droppable target
     * @param event  The drag event being handled
     */
    protected _handleDrop(event: DragEvent): void;

    /* -------------------------------------------- */
    /*  Helpers                                     */
    /* -------------------------------------------- */

    /**
     * A helper to create an image preview element for use during HTML element dragging.
     * @param img
     * @param width
     * @param height
     */
    static createDragImage(img: HTMLImageElement, width: number, height: number): HTMLDivElement;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /** Retrieve the configured DragDrop implementation. */
    static get implementation(): typeof DragDrop;
}
