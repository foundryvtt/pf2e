/**
 * The Drawing object is an implementation of the PlaceableObject container.
 * Each Drawing is a placeable object in the DrawingsLayer.
 */
declare class Drawing<
    TDocument extends DrawingDocument<Scene | null> = DrawingDocument<Scene | null>
> extends PlaceableObject<TDocument> {
    constructor(document: TDocument);

    /** The inner drawing container */
    drawing: PIXI.Container;

    /** The primary drawing shape */
    shape: PIXI.Graphics;

    /** Text content, if included */
    text: PIXI.Text;

    /** The Graphics outer frame and handles */
    frame: PIXI.Container;

    static override embeddedName: "Drawing";

    /** The rate at which points are sampled (in milliseconds) during a freehand drawing workflow */
    static FREEHAND_SAMPLE_RATE: number;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    override get bounds(): PIXI.Rectangle;

    /** A Boolean flag for whether or not the Drawing utilizes a tiled texture background */
    get isTiled(): boolean;

    /** A Boolean flag for whether or not the Drawing is a Polygon type (either linear or freehand) */
    get isPolygon(): boolean;

    /* -------------------------------------------- */
    /* Rendering                                    */
    /* -------------------------------------------- */

    protected _draw(): Promise<void>;

    /** Clean the drawing data to constrain its allowed position */
    protected _cleanData(): void;

    /** Create the components of the drawing element, the drawing container, the drawn shape, and the overlay text */
    protected _createDrawing(): void;

    /** Create elements for the foreground text */
    protected _createText(): void;

    /** A reference to the User who created the Drawing document. */
    get author(): User;

    /** Create elements for the Drawing border and handles */
    protected _createFrame(): void;

    override refresh(): this;

    protected override _refresh(options: object): void;

    /** Draw rectangular shapes */
    protected _drawRectangle(): void;

    /** Draw ellipsoid shapes */
    protected _drawEllipse(): void;

    /** Draw polygonal shapes */
    protected _drawPolygon(): void;

    /** Draw freehand shapes with bezier spline smoothing */
    protected _drawFreehand(): void;

    /**
     * Attribution: The equations for how to calculate the bezier control points are derived from Rob Spencer's article:
     * http://scaledinnovation.com/analytics/splines/aboutSplines.html
     * @param factor   The smoothing factor
     * @param previous The prior point
     * @param point    The current point
     * @param next     The next point
     */
    protected _getBezierControlPoints(
        factor: number,
        previous: [number, number],
        point: [number, number],
        next: [number, number]
    ): void;

    /** Refresh the boundary frame which outlines the Drawing shape */
    protected _refreshFrame({ x, y, width, height }: { x: number; y: number; width: number; height: number }): void;

    /** Add a new polygon point to the drawing, ensuring it differs from the last one */
    protected _addPoint(position: number, temporary?: boolean): void;

    /** Remove the last fixed point from the polygon */
    protected _removePoint(): void;

    protected override _onControl(options?: { releaseOthers?: boolean }): void;

    protected override _onRelease(options?: object): void;

    override _onDelete(options: DocumentModificationContext<TDocument["parent"]>, userId: string): void;

    /** Handle text entry in an active text tool */
    protected _onDrawingTextKeydown(event: KeyboardEvent): void;
}

declare interface Drawing<TDocument extends DrawingDocument<Scene | null> = DrawingDocument<Scene | null>>
    extends PlaceableObject<TDocument> {
    get layer(): DrawingsLayer<this>;
}
