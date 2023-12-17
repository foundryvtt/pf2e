/**
 * A type of Placeable Object which highlights an area of the grid as covered by some area of effect.
 * @category - Canvas
 * @see {@link MeasuredTemplateDocument}
 * @see {@link TemplateLayer}
 */
declare class MeasuredTemplate<
    TDocument extends MeasuredTemplateDocument<Scene | null> = MeasuredTemplateDocument<Scene | null>,
> extends PlaceableObject<TDocument> {
    /** The template shape used for testing point intersection */
    shape: PIXI.Circle | PIXI.Ellipse | PIXI.Polygon | PIXI.Rectangle | PIXI.RoundedRectangle;

    /** The tiling texture used for this template, if any */
    texture: PIXI.Texture | undefined;

    /** The template graphics */
    template: PIXI.Graphics;

    /** The template control icon */
    controlIcon: ControlIcon;

    /** The measurement ruler label */
    ruler: PreciseText;

    /** Internal property used to configure the control border thickness */
    protected _borderThickness: number;

    static override embeddedName: "MeasuredTemplate";

    static override RENDER_FLAGS: {
        redraw: { propagate: ["refresh"] };
        refresh: { propagate: ["refreshState", "refreshShape"]; alias: true };
        refreshState: {};
        refreshShape: { propagate: ["refreshPosition", "refreshGrid", "refreshText", "refreshTemplate"] };
        refreshTemplate: {};
        refreshPosition: { propagate: ["refreshGrid"] };
        refreshGrid: {};
        refreshText: {};
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    override get bounds(): PIXI.Rectangle;

    /** A convenience accessor for the border color as a numeric hex code */
    get borderColor(): number;

    /** A convenience accessor for the fill color as a numeric hex code */
    get fillColor(): number;

    /** A flag for whether the current User has full ownership over the MeasuredTemplate document. */
    get owner(): boolean;

    /** Is this MeasuredTemplate currently visible on the Canvas? */
    get isVisible(): boolean;

    /** A unique identifier which is used to uniquely identify related objects like a template effect or grid highlight. */
    get highlightId(): string;

    // Undocumented
    ray?: Ray;

    /* -------------------------------------------- */
    /*  Initial Drawing                             */
    /* -------------------------------------------- */

    protected _draw(): Promise<void>;

    override _destroy(options?: boolean | PIXI.IDestroyOptions): void;

    /* -------------------------------------------- */
    /*  Incremental Refresh                         */
    /* -------------------------------------------- */

    protected override _applyRenderFlags(flags: { [K in keyof typeof MeasuredTemplate.RENDER_FLAGS]?: boolean }): void;

    protected override _getTargetAlpha(): number;

    /**
     * Compute the geometry for the template using its document data.
     * Subclasses can override this method to take control over how different shapes are rendered.
     */
    protected _computeShape(): PIXI.Circle | PIXI.Rectangle | PIXI.Polygon;

    /**
     * Refresh the display of the template outline and shape.
     * Subclasses may override this method to take control over how the template is visually rendered.
     */
    protected _refreshTemplate(): void;

    /** Get a Circular area of effect given a radius of effect */
    static getCircleShape(distance: number): PIXI.Circle;

    /** Get a Conical area of effect given a direction, angle, and distance */
    static getConeShape(direction: number, angle: number, distance: number): PIXI.Polygon;

    /** Get a Rectangular area of effect given a width and height */
    static getRectShape(direction: number, distance: number): PIXI.Rectangle;

    /** Get a rotated Rectangular area of effect given a width, height, and direction */
    static getRayShape(direction: number, distance: number, width: number): PIXI.Polygon;

    /** Draw the rotation control handle and assign event listeners */
    protected _drawRotationHandle(radius: number): void;

    /** Update the displayed ruler tooltip text */
    protected _refreshRulerText(): void;

    /** Highlight the grid squares which should be shown under the area of effect */
    highlightGrid(): void;

    /** Get the shape to highlight on a Scene which uses grid-less mode. */
    protected _getGridHighlightShape(): PIXI.Polygon | PIXI.Circle | PIXI.Rectangle;

    /** Get an array of points which define top-left grid spaces to highlight for square or hexagonal grids. */
    protected _getGridHighlightPositions(): Point[];

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override rotate(angle: number, snap: number): Promise<TDocument | undefined>;

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    protected override _canControl(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canConfigure(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canView(user: User, event?: PIXI.FederatedEvent): boolean;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    protected override _onUpdate(
        changed: DeepPartial<TDocument["_source"]>,
        options: DocumentModificationContext<TDocument["parent"]>,
        userId: string,
    ): void;

    protected override _onDelete(options: DocumentModificationContext<TDocument["parent"]>, userId: string): void;
}

declare interface MeasuredTemplate<
    TDocument extends MeasuredTemplateDocument<Scene | null> = MeasuredTemplateDocument<Scene | null>,
> extends PlaceableObject<TDocument> {
    get layer(): TemplateLayer<this>;
}
