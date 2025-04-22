import { SceneControl } from "@client/applications/ui/scene-controls.mjs";
import User from "@client/documents/user.mjs";
import CanvasLayer, { CanvasLayerOptions } from "./canvas-layer.mjs";

/**
 * A subclass of CanvasLayer which provides support for user interaction with its contained objects.
 * @category Canvas
 */
export default class InteractionLayer extends CanvasLayer {
    /** Is this layer currently active */
    get active(): boolean;

    override eventMode: "passive";

    /** Customize behaviors of this CanvasLayer by modifying some behaviors at a class level. */
    static get layerOptions(): CanvasLayerOptions;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Activate the InteractionLayer, deactivating other layers and marking this layer's children as interactive.
     * @param [options]     Options which configure layer activation
     * @param options.tool  A specific tool in the control palette to set as active
     * @returns The layer instance, now activated
     */
    activate(options?: { tool: string }): this;

    /** The inner _activate method which may be defined by each InteractionLayer subclass. */
    protected _activate(): void;

    /**
     * Deactivate the InteractionLayer, removing interactivity from its children.
     * @returns The layer instance, now inactive
     */
    deactivate(): this;

    /** The inner _deactivate method which may be defined by each InteractionLayer subclass. */
    protected _deactivate(): void;

    protected override _draw(options: object): Promise<void>;

    /** Get the zIndex that should be used for ordering this layer vertically relative to others in the same Container. */
    getZIndex(): number;

    /** Prepare data used by SceneControls to register tools used by this layer. */
    static prepareSceneControls(): SceneControl | null;

    /**
     * Highlight the objects of this layer.
     * @param active  Should the objects of this layer be highlighted?
     */
    protected _highlightObjects(active: boolean): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle left mouse-click events which originate from the Canvas stage.
     * @param event  The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onClickLeft(event: PIXI.FederatedEvent): void;

    /**
     * Handle double left-click events which originate from the Canvas stage.
     * @param event  The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onClickLeft2(event: PIXI.FederatedEvent): void;

    /**
     * Does the User have permission to left-click drag on the Canvas?
     * @param user   The User performing the action.
     * @param event  The event object.
     */
    protected _canDragLeftStart(user: User, event: PIXI.FederatedEvent): boolean;

    /**
     * Start a left-click drag workflow originating from the Canvas stage.
     * @param event  The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onDragLeftStart(event: PIXI.FederatedEvent): void;

    /**
     * Continue a left-click drag workflow originating from the Canvas stage.
     * @param event  The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onDragLeftMove(event: PIXI.FederatedEvent): void;

    /**
     * Conclude a left-click drag workflow originating from the Canvas stage.
     * @param event  The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onDragLeftDrop(event: PIXI.FederatedEvent): void;

    /**
     * Cancel a left-click drag workflow originating from the Canvas stage.
     * @param event  The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onDragLeftCancel(event: PIXI.FederatedEvent): void;

    /**
     * Handle right mouse-click events which originate from the Canvas stage.
     * @param event  The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onClickRight(event: PIXI.FederatedEvent): void;

    /**
     * Handle double right mouse-click events which originate from the Canvas stage.
     * @param event  The PIXI InteractionEvent which wraps a PointerEvent
     */
    protected _onClickRight2(event: PIXI.FederatedEvent): void;

    /**
     * Handle mouse-wheel events which occur for this active layer.
     * @param event  The WheelEvent initiated on the document
     */
    protected _onMouseWheel(event: WheelEvent): void;

    /**
     * Handle a Cycle View keypress while this layer is active.
     * @param event  The cycle-view key press event
     * @returns  Was the event handled?
     */
    protected _onCycleViewKey(event: KeyboardEvent): boolean;

    /**
     * Handle a Delete keypress while this layer is active.
     * @param event  The delete key press event
     * @returns  Was the event handled?
     */
    protected _onDeleteKey(event: KeyboardEvent): boolean;

    /**
     * Handle a Select All keypress while this layer is active.
     * @param event  The select-all key press event
     * @returns  Was the event handled?
     */
    protected _onSelectAllKey(event: KeyboardEvent): boolean;

    /**
     * Handle a Dismiss keypress while this layer is active.
     * @param event  The dismiss key press event
     * @returns  Was the event handled?
     */
    protected _onDismissKey(event: KeyboardEvent): boolean;

    /**
     * Handle a Undo keypress while this layer is active.
     * @param event  The undo key press event
     * @returns  Was the event handled?
     */
    protected _onUndoKey(event: KeyboardEvent): boolean;

    /**
     * Handle a Cut keypress while this layer is active.
     * @param event  The cut key press event
     * @returns  Was the event handled?
     */
    protected _onCutKey(event: KeyboardEvent): boolean;

    /**
     * Handle a Copy keypress while this layer is active.
     * @param event  The copy key press event
     * @returns  Was the event handled?
     */
    protected _onCopyKey(event: KeyboardEvent): boolean;

    /**
     * Handle a Paste keypress while this layer is active.
     * @param event  The paste key press event
     * @returns  Was the event handled?
     */
    protected _onPasteKey(event: KeyboardEvent): boolean;
}
