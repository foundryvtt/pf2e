/**
 * Handle mouse interaction events for a Canvas object.
 *
 * There are three phases of events: hover, click, and drag
 *
 * Hover Events:
 *
 *  _handleMouseOver
 *      action: hoverIn
 *  _handleMouseOut
 *      action: hoverOut
 *
 * Left Click and Double-Click
 *
 *  _handleMouseDown
 *      action: clickLeft
 *      action: clickLeft2
 *
 * Right Click and Double-Click
 *
 *  _handleRightDown
 *      action: clickRight
 *      action: clickRight2
 *
 * Drag and Drop
 *
 *  _handleMouseMove
 *      action: dragLeftStart
 *      action: dragLeftMove
 *      action: dragRightStart
 *      action: dragLeftMove
 *  _handleMouseUp
 *      action: dragLeftDrop
 *      action: dragRightDrop
 *  _handleDragCancel
 *      action: dragLeftCancel
 *      action: dragRightCancel
 */
declare class MouseInteractionManager {
    object: PlaceableObject;
    layer: PlaceablesLayer;
    permissions: object;
    callbacks: object;
    options: object;

    /**
     * The current interaction state
     */
    state: number;

    /**
     * Bound handlers which can be added and removed
     */
    handlers: Record<string, Function>;

    /**
     * The drag handling time
     */
    dragTime: number;

    /**
     * The time of the last left-click event
     */
    lcTime: number;

    /**
     * The time of the last right-click event
     */
    rcTime: number;

    /**
     * A flag for whether we are right-click dragging
     */
    protected _dragRight: boolean;

    constructor(
        object: PlaceableObject,
        layer: PlaceablesLayer,
        permissions?: object,
        callbacks?: object,
        options?: object
    );

    /** Get the target */
    get target(): PlaceableObject;

    /** Activate interactivity for the handled object */
    activate(): MouseInteractionManager;

    /**
     * Test whether the current user has permission to perform a step of the workflow
     * @param action    The action being attempted
     * @param event     The event being handled
     * @return          Can the action be performed?
     */
    can(action: string, event: Event): boolean;

    /**
     * Execute a callback function associated with a certain action in the workflow
     * @param action    The action being attempted
     * @param event     The event being handled
     */
    callback(action: string, event: Event): unknown;

    /** A reference to the possible interaction states which can be observed */
    get states(): { [x: string]: number };

    /* -------------------------------------------- */
    /*  Listener Activation and Deactivation        */
    /* -------------------------------------------- */

    /**
     * Activate a set of listeners which handle hover events on the target object
     */
    protected _activateHoverEvents(): void;

    /**
     * Activate a new set of listeners for click events on the target object
     */
    protected _activateClickEvents(): void;

    /**
     * Deactivate event listeners for click events on the target object
     */
    protected _deactivateClickEvents(): void;

    /**
     * Activate events required for handling a drag-and-drop workflow
     */
    protected _activateDragEvents(): void;

    /**
     * Deactivate events required for handling drag-and-drop workflow.
     */
    protected _deactivateDragEvents(): void;

    /* -------------------------------------------- */
    /*  Hover In and Hover Out                      */
    /* -------------------------------------------- */

    /** Handle mouse-over events which activate downstream listeners and do not stop propagation. */
    protected _handleMouseOver(event: Event): void;

    /** Handle mouse-out events which terminate hover workflows and do not stop propagation. */
    protected _handleMouseOut(event: Event): void;

    /* -------------------------------------------- */
    /*  Left Click and Double Click                 */
    /* -------------------------------------------- */

    /**
     * Handle mouse-down events which activate downstream listeners.
     * Stop further propagation only if the event is allowed by either single or double-click.
     */
    protected _handleMouseDown(event: Event): void;

    /**
     * Handle mouse-down which trigger a single left-click workflow.
     */
    protected _handleClickLeft(event: Event): void;

    /**
     * Handle mouse-down which trigger a single left-click workflow.
     */
    protected _handleClickLeft2(event: Event): void;

    /* -------------------------------------------- */
    /*  Right Click and Double Click                */
    /* -------------------------------------------- */

    /**
     * Handle right-click mouse-down events.
     * Stop further propagation only if the event is allowed by either single or double-click.
     */
    protected _handleRightDown(event: Event): void;

    /**
     * Handle single right-click actions.
     */
    protected _handleClickRight(event: Event): void;

    /**
     * Handle double right-click actions.
     */
    protected _handleClickRight2(event: Event): void;

    /* -------------------------------------------- */
    /*  Drag and Drop                               */
    /* -------------------------------------------- */

    /** Handle mouse movement during a drag workflow */
    protected _handleMouseMove(event: Event): void;

    /** Handle the beginning of a new drag start workflow, moving all controlled objects on the layer */
    protected _handleDragStart(event: Event): void;

    /** Handle the continuation of a drag workflow, moving all controlled objects on the layer */
    protected _handleDragMove(event: Event): void;

    /** Handle mouse up events which may optionally conclude a drag workflow */
    protected _handleMouseUp(event: Event): void;

    /**
     * Handle the conclusion of a drag workflow, placing all dragged objects back on the layer
     */
    protected _handleDragDrop(event: Event): void;

    /**
     * Handle the cancellation of a drag workflow, resetting back to the original state
     */
    protected _handleDragCancel(event: Event): void;
}
