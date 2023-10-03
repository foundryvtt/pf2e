declare class ResizeHandle extends PIXI.Graphics {
    offset: PointArray;

    /** Track whether the handle is being actively used for a drag workflow */
    active: boolean;

    constructor(offset: PointArray, handlers?: Record<string, unknown>);

    refresh(bounds: PIXI.Rectangle): void;

    updateDimensions(
        current: PIXI.Point,
        origin: PIXI.Rectangle,
        destination: PIXI.Point,
        { aspectRatio }?: { aspectRatio?: number | null }
    ): {
        x: number;
        y: number;
        width: number;
        height: number;
    };

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

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
