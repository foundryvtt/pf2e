interface MeasuredTemplateData extends PlaceableObjectData {
    t: string;
    user: string;
    direction: number;
    angle: number;
    distance: number;
    borderColor: string;
    fillColor: string;
    texture: string;
}


/**
 * A MeasuredTemplate is an implementation of PlaceableObject which represents an area of the canvas grid which is
 * covered by some effect.
 *
 * @example
 * MeasuredTemplate.create({
 *   t: "cone",
 *   user: game.user._id,
 *   x: 1000,
 *   y: 1000,
 *   direction: 0.45,
 *   angle: 63.13,
 *   distance: 30,
 *   borderColor: "#FF0000",
 *   fillColor: "#FF3366",
 *   texture: "tiles/fire.jpg"
 * });
 */
declare class MeasuredTemplate extends PlaceableObject {
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** @override */
    data: MeasuredTemplateData;

    /**
     * A convenience accessor for the border color as a numeric hex code
     */
    get borderColor(): number;

    /* -------------------------------------------- */

    /**
     * A convenience accessor for the fill color as a numeric hex code
     */
    get fillColor(): number;

    /** @override */
    static get layer(): TemplateLayer;

    /** @override */
    get layer(): TemplateLayer;

    /* -------------------------------------------- */
    /*  Rendering
    /* -------------------------------------------- */
    /**
     * Draw the ControlIcon for the MeasuredTemplate
     */
    protected _drawControlIcon(): ControlIcon;

    /* -------------------------------------------- */

    /**
     * Draw the Text label used for the MeasuredTemplate
     */
    protected _drawRulerText(): PIXI.Text;

    /* -------------------------------------------- */

    /**
     * Get a Circular area of effect given a radius of effect
     */
    protected _getCircleShape(distance: number): PIXI.Circle;

    /* -------------------------------------------- */

    /**
     * Get a Conical area of effect given a direction, angle, and distance
     */
    protected _getConeShape(direction: number, angle: number, distance: number): PIXI.Polygon;

    /* -------------------------------------------- */

    /**
     * Get a Rectangular area of effect given a width and height
     */
    protected _getRectShape(direction: number, distance: number): PIXI.Rectangle;

    /* -------------------------------------------- */

    /**
     * Get a rotated Rectangular area of effect given a width, height, and direction
     */
    protected _getRayShape(direction: number, distance: number, width: number): PIXI.Polygon;

    /* -------------------------------------------- */

    /**
     * Draw the rotation control handle and assign event listeners
     */
    protected _drawRotationHandle(radius: number): void;

    /* -------------------------------------------- */

    /**
     * Update the displayed ruler tooltip text
     * @private
     */
    _refreshRulerText(): void;

    /* -------------------------------------------- */

    /**
     * Highlight the grid squares which should be shown under the area of effect
     */
    highlightGrid(): void;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    /** @override */
    _canControl(user: User, event?: Event): boolean;

    /** @override */
    _canConfigure(user: User, event?: Event): boolean;

    /** @override */
    _canView(user: User, event?: Event): boolean;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    /** @override */
    _onUpdate(data: any): void;

    /* -------------------------------------------- */

    /** @override */
    _onDelete(): void;
}
