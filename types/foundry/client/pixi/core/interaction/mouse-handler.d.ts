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

    /** The current interaction state */
    state: number;

    /** Bound handlers which can be added and removed */
    handlers: Record<string, (...args: unknown[]) => void>;

    /** The drag handling time */
    dragTime: number;

    /** The time of the last left-click event */
    lcTime: number;

    /** The time of the last right-click event */
    rcTime: number;

    /** A flag for whether we are right-click dragging */
    _dragRight: boolean;

    /** An optional ControlIcon instance for the object */
    controlIcon: ControlIcon | null;

    /**
     * The view id pertaining to the PIXI Application.
     * If not provided, default to canvas.app.view.id
     */
    viewId: string;

    /** The client position of the last left/right-click */
    lastClick: PIXI.Point;

    constructor(
        object: PlaceableObject,
        layer: PlaceablesLayer,
        permissions?: object,
        callbacks?: object,
        options?: object,
    );

    /**
     * Enumerate the states of a mouse interaction workflow.
     * 0: NONE - the object is inactive
     * 1: HOVER - the mouse is hovered over the object
     * 2: CLICKED - the object is clicked
     * 3: GRABBED - the object is grabbed
     * 4: DRAG - the object is being dragged
     * 5: DROP - the object is being dropped
     */
    static INTERACTION_STATES: {
        NONE: 0;
        HOVER: 1;
        CLICKED: 2;
        GRABBED: 3;
        DRAG: 4;
        DROP: 5;
    };

    /** The maximum number of milliseconds between two clicks to be considered a double-click. */
    static DOUBLE_CLICK_TIME_MS: number;

    /** The maximum number of pixels between two clicks to be considered a double-click. */
    static DOUBLE_CLICK_DISTANCE_PX: number;

    /** The number of milliseconds of mouse click depression to consider it a long press. */
    static LONG_PRESS_DURATION_MS: number;

    /** Global timeout for the long-press event. */
    static longPressTimeout: number | null;

    /**
     * Emulate a pointermove event. Needs to be called when an object with the static event mode
     * or any of its parents is transformed or its visibility is changed.
     */
    static emulateMoveEvent(): void;

    /** Get the target */
    get target(): PlaceableObject;

    /** Is this mouse manager in a dragging state? */
    get isDragging(): boolean;

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

    /**
     * A reference to the possible interaction states which can be observed
     * -2: SKIPPED - the handler has been skipped by previous logic
     * -1: DISALLOWED - the handler has dissallowed further process
     *  1: REFUSED - the handler callback has been processed and is refusing further process
     *  2: ACCEPTED - the handler callback has been processed and is accepting further process
     */
    get handlerOutcomes(): {
        SKIPPED: -2;
        DISALLOWED: -1;
        REFUSED: 1;
        ACCEPTED: 2;
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

    /**
     * A public method to cancel a current interaction workflow from this manager.
     * @param [event] The event that initiates the cancellation
     */
    cancel(event?: PIXI.FederatedEvent): void;
}
