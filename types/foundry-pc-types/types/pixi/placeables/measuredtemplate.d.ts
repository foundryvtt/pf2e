/**
 * A MeasuredTemplate is an implementation of PlaceableObject which represents an area of the canvas grid which is
 * covered by some effect.
 * @extends {PlaceableObject}
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
    constructor(...args);

    /* -------------------------------------------- */

    /** @override */
    static get embeddedName(): string;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A convenience accessor for the border color as a numeric hex code
     * @return {number}
     */
    get borderColor(): number;

    /* -------------------------------------------- */

    /**
     * A convenience accessor for the fill color as a numeric hex code
     * @return {number}
     */
    get fillColor(): number;

    /* -------------------------------------------- */

    /** @override */
    get owner(): boolean;

    /* -------------------------------------------- */
    /*  Rendering
    /* -------------------------------------------- */

    /** @override */
    draw(): Promise<PlaceableObject>;

    /* -------------------------------------------- */

    /**
     * Draw the ControlIcon for the MeasuredTemplate
     * @return {ControlIcon}
     * @private
     */
    _drawControlIcon(): ControlIcon;

    /* -------------------------------------------- */

    /**
     * Draw the Text label used for the MeasuredTemplate
     * @return {PIXI.Text}
     * @private
     */
    _drawRulerText(): PIXI.Text;

    /* -------------------------------------------- */

    /** @override */
    refresh(): PlaceableObject;

    /* -------------------------------------------- */

    /**
     * Get a Circular area of effect given a radius of effect
     * @private
     */
    _getCircleShape(distance: number): PIXI.Circle;

    /* -------------------------------------------- */

    /**
     * Get a Conical area of effect given a direction, angle, and distance
     * @private
     */
    _getConeShape(direction: number, angle: number, distance: number): PIXI.Polygon;

    /* -------------------------------------------- */

    /**
     * Get a Rectangular area of effect given a width and height
     * @private
     */
    _getRectShape(direction: number, distance: number): PIXI.Rectangle;

    /* -------------------------------------------- */

    /**
     * Get a rotated Rectangular area of effect given a width, height, and direction
     * @private
     */
    _getRayShape(direction: number, distance: number, width: number): PIXI.Polygon;

    /* -------------------------------------------- */

    /**
     * Draw the rotation control handle and assign event listeners
     * @private
     */
    _drawRotationHandle(radius: number): void;

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

    /** @override */
    rotate(angle: number, snap: number): Promise<PlaceableObject>;

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
