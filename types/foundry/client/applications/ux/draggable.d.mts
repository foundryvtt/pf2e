import { Application } from "@client/appv1/api/_module.mjs";
import { ApplicationV2 } from "../api/_module.mjs";

interface DraggableResizeOptions {
    /** A CSS selector for the resize handle. */
    selector?: string;
    /** Enable resizing along the X axis. Default: `true` */
    resizeX?: boolean;
    /** Enable resizing along the Y axis. Default: `true` */
    resizeY?: boolean;
    /** Modify the resizing direction to be right-to-left. */
    rtl?: boolean;
}

/**
 * A UI utility to make an element draggable.
 */
export default class Draggable {
    /**
     * @param app       The Application that is being made draggable.
     * @param element   The Application's outer-most element.
     * @param handle    The element that acts as a drag handle. Supply false to disable dragging.
     * @param resizable Is the application resizable? Supply an object to configure resizing behavior
     *                  or true to have it automatically configured.
     */
    constructor(
        app: Application | ApplicationV2,
        element: HTMLElement | JQuery,
        handle: HTMLElement | false,
        resizable: boolean | DraggableResizeOptions,
    );

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** The Application being made draggable. */
    app: Application | ApplicationV2;

    /** The Application's outer-most element. */
    element: HTMLElement;

    /** The drag handle, or false to disable dragging. */
    handle: HTMLElement | false;

    /** Registered event handlers. */
    handlers: Record<string, Function>;

    /** The Application's starting position, pre-drag. */
    position: object;

    /** Resize configuration. */
    resizable: boolean | DraggableResizeOptions;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Activate event handling for a Draggable application
     * Attach handlers for floating, dragging, and resizing
     */
    activateListeners(): void;

    /** Attach handlers for dragging and floating. */
    protected _activateDragListeners(): void;

    /** Attach handlers for resizing. */
    protected _activateResizeListeners(): void;

    /**
     * Handle the initial mouse click which activates dragging behavior for the application
     * @param event
     */
    protected _onDragMouseDown(event: PointerEvent): void;

    /**
     * Move the window with the mouse, bounding the movement to ensure the window stays within bounds of the viewport
     * @param event
     */
    protected _onDragMouseMove(event: PointerEvent): void;

    /**
     * Conclude the dragging behavior when the mouse is release, setting the final position and removing listeners
     * @param event
     */
    protected _onDragMouseUp(event: PointerEvent): void;

    /**
     * Handle the initial mouse click which activates dragging behavior for the application
     * @param event
     */
    protected _onResizeMouseDown(event: PointerEvent): void;

    /**
     * Move the window with the mouse, bounding the movement to ensure the window stays within bounds of the viewport
     * @param event
     */
    protected _onResizeMouseMove(event: PointerEvent): void;

    /**
     * Conclude the dragging behavior when the mouse is release, setting the final position and removing listeners
     * @param event
     */
    protected _onResizeMouseUp(event: PointerEvent): void;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /** Retrieve the configured Draggable implementation. */
    static get implementation(): typeof Draggable;
}
