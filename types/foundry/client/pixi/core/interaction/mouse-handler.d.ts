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
        options?: object,
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
    get states(): {
        NONE: 0;
        HOVER: 1;
        CLICKED: 2;
        DRAG: 3;
        DROP: 4;
    };

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
    /*  Drag and Drop                               */
    /* -------------------------------------------- */

    /**
     * A public method to handle directly an event into this manager, according to its type.
     * Note: drag events are not handled.
     * @returns Has the event been processed?
     */
    handleEvent(event: PIXI.FederatedEvent): boolean;
}
