import { Wall } from "@client/canvas/placeables/_module.mjs";
import WallDocument from "@client/documents/wall.mjs";

/**
 * An icon representing a Door Control
 */
export default class DoorControl extends PIXI.Container {
    constructor(wall: Wall);

    wall: Wall;

    /**
     * The center of the wall which contains the door.
     */
    get center(): PIXI.Point;

    /**
     * Draw the DoorControl icon, displaying its icon texture and border
     */
    draw(): Promise<this>;

    /**
     * Get the icon texture to use for the Door Control icon based on the door state
     */
    protected _getTexture(): PIXI.Texture;

    reposition(): void;

    /**
     * Determine whether the DoorControl is visible to the calling user's perspective.
     * The control is always visible if the user is a GM and no Tokens are controlled.
     * @see {CanvasVisibility#testVisibility}
     */
    get isVisible(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * Handle mouse over events on a door control icon.
     * @param {PIXI.FederatedEvent} event      The originating interaction event
     * @protected
     */
    protected _onMouseOver(event: PIXI.FederatedPointerEvent): false | void;

    /**
     * Handle mouse out events on a door control icon.
     * @param event The originating interaction event
     */
    protected _onMouseOut(event: PIXI.FederatedPointerEvent): false | void;

    /**
     * Handle left mouse down events on a door control icon.
     * This should only toggle between the OPEN and CLOSED states.
     * @param event The originating interaction event
     */
    protected _onMouseDown(event: PIXI.FederatedPointerEvent): Promise<WallDocument | undefined> | boolean | void;

    /**
     * Handle right mouse down events on a door control icon.
     * This should toggle whether the door is LOCKED or CLOSED.
     * @param event The originating interaction event
     */
    protected _onRightDown(event: PIXI.FederatedPointerEvent): Promise<WallDocument | undefined> | void;
}
