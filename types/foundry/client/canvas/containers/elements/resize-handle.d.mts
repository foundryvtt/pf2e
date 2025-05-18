import { Point, Rectangle } from "@common/_types.mjs";

/**
 * A class based on PIXI.Graphics, that allows to create a resize handle in the desired area.
 */
export default class ResizeHandle extends PIXI.Graphics {
    /**
     * @param offset A two-element array [xFactor, yFactor] which defines the normalized position of this handle
     *               relative to the bounding box.
     * @param handlers.canDrag A function determining if this handle can initiate a drag.
     */
    constructor(offset: number, handlers?: { canDrag?: () => boolean });

    /**
     * Track whether the handle is being actively used for a drag workflow
     */
    active: boolean;

    /**
     * Refresh the position and hit area of this handle based on the provided bounding box.
     * @param bounds The bounding box in which this handle operates.
     */
    refresh(bounds: Rectangle): void;

    /**
     * Compute updated dimensions for an object being resized, respecting optional constraints.
     * @param current             The current geometric state of the object
     * @param origin              The original position and dimensions used for reference
     * @param destination         The coordinates where the pointer was released
     * @param options.aspectRatio If provided, a numeric aspect ratio to maintain (width/height).
     * @returns An object containing the adjusted {x, y, width, height}.
     */
    updateDimensions(
        current: Rectangle,
        origin: Rectangle,
        destination: Point,
        options?: { aspectRatio?: number | null },
    ): Rectangle;

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    /**
     * Activate listeners for pointer events, enabling hover and mouse-down behavior on the resize handle.
     */
    activateListeners(): void;

    /**
     * Handle mouse-over event on a control handle
     * @param event The mouseover event
     */
    protected _onHoverIn(event: PIXI.FederatedEvent): void;

    /**
     * Handle mouse-out event on a control handle
     * @param event The mouseout event
     */
    protected _onHoverOut(event: PIXI.FederatedEvent): void;

    /**
     * When we start a drag event - create a preview copy of the Tile for re-positioning
     * @param event The mousedown event
     */
    protected _onMouseDown(event: PIXI.FederatedEvent): void;
}
