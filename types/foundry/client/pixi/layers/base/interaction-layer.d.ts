/**
 * A subclass of CanvasLayer which provides support for user interaction with its contained objects.
 * @category - Canvas
 */
declare abstract class InteractionLayer extends CanvasLayer {
    /** Is this layer currently active */
    get active(): boolean;

    /** Customize behaviors of this CanvasLayer by modifying some behaviors at a class level. */
    static get layerOptions(): InteractionLayerOptions;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Activate the InteractionLayer, deactivating other layers and marking this layer's children as interactive.
     * @param options Options which configure layer activation
     * @param options.tool   A specific tool in the control palette to set as active
     * @returns The layer instance, now activated
     */
    activate(options?: { tool?: string }): this;

    /** The inner _activate method which may be defined by each InteractionLayer subclass. */
    protected _activate(): void;

    /**
     * Deactivate the InteractionLayer, removing interactivity from its children.
     * @returns The layer instance, now inactive
     */
    deactivate(): this;

    /** The inner _deactivate method which may be defined by each InteractionLayer subclass. */
    protected _deactivate(): void;

    protected _draw(options: object): Promise<void>;

    /**
     * Get the zIndex that should be used for ordering this layer vertically relative to others in the same Container.
     */
    getZIndex(): number;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle left mouse-click events which originate from the Canvas stage.
     * @see {@link Canvas.#onClickLeft}
     * @param event The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onClickLeft(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle double left-click events which originate from the Canvas stage.
     * @see {@link Canvas.#onClickLeft2}
     * @param event The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onClickLeft2(event: PIXI.FederatedPointerEvent): void;

    /**
     * Does the User have permission to left-click drag on the Canvas?
     * @param user      The User performing the action.
     * @param event     The event object.
     * @protected
     */
    protected _canDragLeftStart(user: User, event: PIXI.FederatedEvent): boolean;

    /**
     * Start a left-click drag workflow originating from the Canvas stage.
     * @see {@link Canvas.#onDragLeftStart}
     * @param event The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onDragLeftStart(event: PIXI.FederatedPointerEvent): object | void;

    /**
     * Continue a left-click drag workflow originating from the Canvas stage.
     * @see {@link Canvas.#onDragLeftMove}
     * @param event The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onDragLeftMove(event: PIXI.FederatedPointerEvent): void;

    /**
     * Conclude a left-click drag workflow originating from the Canvas stage.
     * @see {@link Canvas.#onDragLeftDrop}
     * @param event The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onDragLeftDrop(event: PIXI.FederatedPointerEvent): void;

    /**
     * Cancel a left-click drag workflow originating from the Canvas stage.
     * @see {@link Canvas.#onDragLeftDrop}
     * @param event A right-click pointer event on the document.
     */
    protected _onDragLeftCancel(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle right mouse-click events which originate from the Canvas stage.
     * @see {@link Canvas._onClickRight}
     * @param event The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onClickRight(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle mouse-wheel events which occur for this active layer.
     * @see {@link MouseManager._onWheel}
     * @param event The WheelEvent initiated on the document
     */
    protected _onMouseWheel(event: WheelEvent): void;

    /**
     * Handle a DELETE keypress while this layer is active.
     * @see {@link ClientKeybindings._onDelete}
     * @param event The delete key press event
     */
    protected _onDeleteKey(event: KeyboardEvent): Promise<void>;
}

declare interface InteractionLayer extends CanvasLayer {
    constructor: typeof InteractionLayer;
}

declare interface InteractionLayerOptions extends CanvasLayerOptions {
    sortActiveTop: boolean;
    zIndex: number;
}
