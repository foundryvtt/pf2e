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
declare class MeasuredTemplate<
    TDocument extends MeasuredTemplateDocument = MeasuredTemplateDocument
> extends PlaceableObject<TDocument> {
    /** The template shape used for testing point intersection */
    shape: PIXI.Circle | PIXI.Ellipse | PIXI.Polygon | PIXI.Rectangle | PIXI.RoundedRectangle;

    /** The tiling texture used for this template, if any */
    texture: PIXI.Texture | undefined;

    /** The template graphics */
    template: PIXI.Graphics;

    /** The UI frame container which depicts Token metadata and status, displayed in the ControlsLayer. */
    hud: ObjectHUD<this>;

    /** Internal property used to configure the control border thickness */
    protected _borderThickness: number;

    static override embeddedName: "MeasuredTemplate";

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    override get bounds(): NormalizedRectangle;

    /** A convenience accessor for the border color as a numeric hex code */
    get borderColor(): number;

    /** A convenience accessor for the fill color as a numeric hex code */
    get fillColor(): number;

    /** A flag for whether the current User has full ownership over the MeasuredTemplate document. */
    get owner(): boolean;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    override draw(): Promise<this>;

    override destroy(options?: boolean | PIXI.IDestroyOptions): void;

    /** Draw the HUD container which provides an interface for managing this template */
    protected _drawHUD(): ObjectHUD<this>;

    /** Draw the ControlIcon for the MeasuredTemplate */
    protected _drawControlIcon(): ControlIcon;

    /** Draw the Text label used for the MeasuredTemplate */
    protected _drawRulerText(): PIXI.Text;

    override refresh(): this;

    /** Get a Circular area of effect given a radius of effect */
    protected _getCircleShape(distance: number): PIXI.Circle;

    /** Get a Conical area of effect given a direction, angle, and distance */
    protected _getConeShape(direction: number, angle: number, distance: number): PIXI.Polygon;

    /** Get a Rectangular area of effect given a width and height */
    protected _getRectShape(direction: number, distance: number): PIXI.Rectangle;

    /** Get a rotated Rectangular area of effect given a width, height, and direction */
    protected _getRayShape(direction: number, distance: number, width: number): PIXI.Polygon;

    /** Draw the rotation control handle and assign event listeners */
    protected _drawRotationHandle(radius: number): void;

    /** Update the displayed ruler tooltip text */
    protected _refreshRulerText(): void;

    /** Highlight the grid squares which should be shown under the area of effect */
    highlightGrid(): void;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override rotate(angle: number, snap: number): Promise<TDocument | undefined>;

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    protected override _canControl(user: User, event?: PIXI.InteractionEvent): boolean;

    protected override _canConfigure(user: User, event?: PIXI.InteractionEvent): boolean;

    protected override _canView(user: User, event?: PIXI.InteractionEvent): boolean;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    override _onUpdate(
        changed: DeepPartial<TDocument["data"]["_source"]>,
        options: DocumentModificationContext<TDocument>,
        userId: string
    ): void;

    override _onDelete(options: DocumentModificationContext<TDocument>, userId: string): void;
}

declare interface MeasuredTemplate<TDocument extends MeasuredTemplateDocument = MeasuredTemplateDocument>
    extends PlaceableObject<TDocument> {
    get layer(): TemplateLayer<this>;
}
