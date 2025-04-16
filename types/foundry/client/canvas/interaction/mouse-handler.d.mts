import { ControlIcon } from "../containers/_module.mjs";

/**
 * Handle mouse interaction events for a Canvas object.
 * There are three phases of events: hover, click, and drag
 *
 * Hover Events:
 * _handlePointerOver
 *  action: hoverIn
 * _handlePointerOut
 *  action: hoverOut
 *
 * Left Click and Double-Click
 * _handlePointerDown
 *  action: clickLeft
 *  action: clickLeft2
 *  action: unclickLeft
 *
 * Right Click and Double-Click
 * _handleRightDown
 *  action: clickRight
 *  action: clickRight2
 *  action: unclickRight
 *
 * Drag and Drop
 * _handlePointerMove
 *  action: dragLeftStart
 *  action: dragRightStart
 *  action: dragLeftMove
 *  action: dragRightMove
 * _handlePointerUp
 *  action: dragLeftDrop
 *  action: dragRightDrop
 * _handleDragCancel
 *  action: dragLeftCancel
 *  action: dragRightCancel
 */
export default class MouseInteractionManager {
    /**
     * @param {PIXI.DisplayObject} object             The Canvas object (e.g., a Token, Tile, or Drawing) to which
     *                                                mouse events should be bound.
     * @param {PIXI.Container} layer                  The Canvas Layer that contains the object.
     * @param {object} [permissions={}]               An object of permission checks, keyed by action name, which return
     *                                                a boolean or invoke a function for whether the action is allowed.
     * @param {object} [callbacks={}]                 An object of callback functions, keyed by action name, which will
     *                                                be executed during the event workflow (e.g., hoverIn, clickLeft).
     * @param {object} [options={}]                   Additional options that configure interaction behavior.
     * @param {string} [options.target]               If provided, the property name on `object` which references
     *                                                a `ControlIcon`. This is used to set {@link MouseInteractionManager#controlIcon}.
     * @param {number} [options.dragResistance=10]     A minimum number of pixels the mouse must move before a drag is initiated.
     * @param {PIXI.Application} [options.application] A specific PIXI Application to use for pointer event handling
     *                                                 defaults to `canvas.app` if not provided.
     */
    constructor(
        object: PIXI.DisplayObject,
        layer: PIXI.Container,
        permissions?: object,
        callbacks?: object,
        options?: { target?: string; dragResistance?: number; application?: PIXI.Application },
    );

    /**
     * Interaction options which configure handling workflows
     */
    options: { target: PIXI.DisplayObject; dragResistance: number };

    /**
     * The current interaction state
     */
    state: number;

    /**
     * Bound interaction data object to populate with custom data.
     */
    interactionData: Record<string, unknown>;

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
     * @internal
     */
    _dragRight: boolean;

    /**
     * An optional ControlIcon instance for the object
     */
    controlIcon: ControlIcon | null;

    /**
     * The view id pertaining to the PIXI Application.
     * If not provided, default to canvas.app.view.id
     */
    viewId: string;

    /**
     * The client position of the last left/right-click.
     */
    lastClick: PIXI.Point;

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

    /**
     * The minimum distance, measured in screen-coordinate pixels, that a pointer must move to initiate a drag operation.
     * This default value can be overridden by specifying the `dragResistance` option when invoking the constructor.
     */
    static DEFAULT_DRAG_RESISTANCE_PX: number;

    /**
     * The maximum number of milliseconds between two clicks to be considered a double-click.
     */
    static DOUBLE_CLICK_TIME_MS: number;

    /**
     * The maximum number of pixels between two clicks to be considered a double-click.
     */
    static DOUBLE_CLICK_DISTANCE_PX: 5;

    /**
     * The number of milliseconds of mouse click depression to consider it a long press.
     */
    static LONG_PRESS_DURATION_MS: number;

    /**
     * Global timeout for the long-press event.
     */
    static longPressTimeout: number | null;

    /**
     * Emulate a pointermove event on the main game canvas.
     * This method must be called when an object with the static event mode or any of its parents is transformed
     * or its visibility is changed.
     */
    static emulateMoveEvent(): void;

    /**
     * Get the target.
     */
    get target(): PIXI.DisplayObject;

    /**
     * Is this mouse manager in a dragging state?
     */
    get isDragging(): boolean;

    /**
     * Activate interactivity for the handled object
     */
    activate(): this;

    /**
     * Test whether the current user has permission to perform a step of the workflow
     * @param action The action being attempted
     * @param event  The event being handled
     * @returns Can the action be performed?
     */
    can(action: string, event: Event | PIXI.FederatedEvent): boolean;

    /**
     * Execute a callback function associated with a certain action in the workflow
     * @param action The action being attempted
     * @param event  The event being handled
     * @param args   Additional callback arguments.
     * @returns A boolean which may indicate that the event was handled by the callback. Events which do not specify a
     *         callback are assumed to have been handled as no-op.
     */
    callback(action: string, event: Event | PIXI.FederatedEvent, ...args: unknown[]): boolean;

    /**
     * A reference to the possible interaction states which can be observed
     */
    get states(): Record<string, number>;

    /**
     * A reference to the possible interaction states which can be observed
     */
    get handlerOutcomes(): Record<string, number>;

    /* -------------------------------------------- */
    /*  Left Click and Double Click                 */
    /* -------------------------------------------- */

    /**
     * A public method to handle directly an event into this manager, according to its type.
     * Note: drag events are not handled.
     * @returns Has the event been processed?
     */
    handleEvent(event: PIXI.FederatedEvent): boolean;

    /**
     * A public method to cancel a current interaction workflow from this manager.
     * @param event The event that initiates the cancellation
     */
    cancel(event?: PIXI.FederatedEvent): void;

    /**
     * Reset the mouse manager.
     * @param options.interactionData Reset the interaction data?
     * @param options.state           Reset the state?
     */
    reset(options?: { interactionData?: boolean; state?: boolean }): void;
}
