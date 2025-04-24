import User from "@client/documents/user.mjs";
import { ElevatedPoint, Point, Rectangle } from "@common/_types.mjs";
import { UnboundContainer } from "../containers/_module.mjs";
import Cursor from "../containers/elements/cursor.mjs";
import { BaseRuler, PingData, PingOptions } from "../interaction/_module.mjs";
import { CanvasLayerOptions } from "./base/canvas-layer.mjs";
import InteractionLayer from "./base/interaction-layer.mjs";

interface PingOffscreenDrawOptions<TUser extends User> {
    /** The style of ping to draw, from {@link CONFIG.Canvas.pings}. Default: `"arrow"`. */
    style?: string;
    /** The User who pinged. */
    user?: TUser;
}

interface PingDrawOptions<TUser extends User> {
    /** The style of ping to draw, from  {@link CONFIG.Canvas.pings}. Default: `"pulse"`. */
    style?: string;
    /** The User who pinged. */
    user?: TUser;
}

/**
 * A CanvasLayer for displaying UI controls which are overlayed on top of other layers.
 *
 * We track three types of events:
 * 1) Cursor movement
 * 2) Ruler measurement
 * 3) Map pings
 */
export default class ControlsLayer<TUser extends User = User> extends InteractionLayer {
    // Always interactive even if disabled for doors controls
    override interactiveChildren: true;

    /** A container of DoorControl instances */
    doors: PIXI.Container;

    /**
     * A container of pings interaction elements.
     * Contains pings elements.
     */
    pings: PIXI.Container;

    /**
     * A container of cursor interaction elements not bound to stage transforms.
     * Contains cursors elements.
     */
    cursors: UnboundContainer;

    /**
     * The ruler paths.
     * @internal
     */
    _rulerPaths: PIXI.Container;

    /** A graphics instance used for drawing debugging visualization */
    debug: PIXI.Graphics;

    /** The Canvas selection rectangle */
    select: PIXI.Graphics;

    static override get layerOptions(): CanvasLayerOptions;

    /* -------------------------------------------- */
    /*  Properties and Public Methods               */
    /* -------------------------------------------- */

    /** A convenience accessor to the Ruler for the active game user */
    get ruler(): BaseRuler;

    /**
     * Get the Ruler instance for a specific User ID.
     * @param userId  The User ID
     */
    getRulerForUser(userId: string): BaseRuler | null;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _draw(options?: object): Promise<void>;

    protected override _tearDown(options?: object): Promise<void>;

    /** Draw the cursors container */
    drawCursors(): void;

    /** Create and add Ruler instances for every game User. */
    drawRulers(): Promise<void>;

    /** Draw door control icons to the doors container. */
    drawDoors(): void;

    /**
     * Draw the select rectangle given an event originated within the base canvas layer
     * @param coords  The rectangle
     */
    drawSelect(coords: Rectangle): void;

    protected override _deactivate(): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * Handle mousemove events on the game canvas to broadcast activity of the user's cursor position
     * @param currentPos
     * @internal
     */
    _onMouseMove(currentPos: PIXI.Point): void;

    /**
     * Handle pinging the canvas.
     * @param event   The triggering canvas interaction event.
     * @param origin  The local canvas coordinates of the mousepress.
     */
    protected _onLongPress(event: PIXI.FederatedEvent, origin: PIXI.Point): void;

    /** Handle the canvas panning to a new view. */
    protected _onCanvasPan(): void;

    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */

    /**
     * Create and draw the Cursor object for a given User.
     * @param user The User document for whom to draw the cursor Container
     */
    drawCursor(user: TUser): Cursor;

    /**
     * Create and draw the Ruler object for a given User.
     * @param user  The User document for whom to draw the Ruler
     * @returns  The Ruler instance
     */
    drawRuler(user: TUser): Promise<BaseRuler>;

    /**
     * Update the cursor when the user moves to a new position
     * @param user      The User for whom to update the cursor
     * @param position  The new cursor position
     */
    updateCursor(user: TUser, position: Point): void;

    /**
     * Update the Ruler for a User given the provided path.
     * @param user  The User for whom to update the Ruler
     * @param data  The path and hidden state of the Ruler
     */
    updateRuler(user: TUser, data: { path: ElevatedPoint[]; hidden: boolean } | null): Promise<void>;

    /**
     * Handle a broadcast ping.
     * @see {@link ControlsLayer#drawPing}
     * @param user      The user who pinged.
     * @param position  The position on the canvas that was pinged.
     * @param [data]    The broadcast ping data.
     * @returns  A promise which resolves once the Ping has been drawn and animated
     */
    handlePing(user: TUser, position: Point, data?: PingData): Promise<boolean>;

    /**
     * Draw a ping at the edge of the viewport, pointing to the location of an off-screen ping.
     * @see {@link ControlsLayer#drawPing}
     * @param position   The coordinates of the off-screen ping.
     * @param [options]  Additional options to configure how the ping is drawn.
     * @returns  A promise which resolves once the Ping has been drawn and animated.
     */
    drawOffscreenPing(position: Point, options?: PingOptions & PingOffscreenDrawOptions<TUser>): Promise<boolean>;

    /**
     * Draw a ping on the canvas.
     * @see {@link foundry.canvas.interaction.Ping#animate}
     * @param position   The position on the canvas that was pinged.
     * @param [options]  Additional options to configure how the ping is drawn.
     * @returns  A promise which resolves once the Ping has been drawn and animated.
     */
    drawPing(position: Point, options?: PingOptions & PingDrawOptions<TUser>): Promise<boolean>;
}
