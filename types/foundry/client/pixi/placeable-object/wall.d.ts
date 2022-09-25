/**
 * A Wall is an implementation of PlaceableObject which represents a physical or visual barrier within the Scene.
 * Walls are used to restrict Token movement or visibility as well as to define the areas of effect for ambient lights
 * and sounds.
 */
declare class Wall<TDocument extends WallDocument = WallDocument> extends PlaceableObject<TDocument> {
    constructor(document?: TDocument);

    /** An reference the Door Control icon associated with this Wall, if any */
    protected doorControl: DoorControl | null;

    /** A reference to an overhead Tile that is a roof, interior to which this wall is contained */
    roof: Tile;

    static embeddedName: "Wall";

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A convenience reference to the coordinates Array for the Wall endpoints, [x0,y0,x1,y1]. */
    get coords(): number[];

    get bounds(): PIXI.Rectangle;

    /** Return the coordinates [x,y] at the midpoint of the wall segment */
    get midpoint(): number[];

    get center(): PIXI.Point;

    /**
     * Get the direction of effect for a directional Wall
     * @return The angle of wall effect
     */
    get direction(): number | null;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * This helper converts the wall segment to a Ray
     * @return The wall in Ray representation
     */
    toRay(): Ray;

    protected _draw(): Promise<void>;

    protected _createInteractionManager(): MouseInteractionManager;

    activateListeners(): void;

    /**
     * Draw a directional prompt icon for one-way walls to illustrate their direction of effect.
     * @return The drawn icon
     */
    _drawDirection(): PIXI.Sprite | null;

    refresh(): this;

    /**
     * Compute an approximate Polygon which encloses the line segment providing a specific hitArea for the line
     * @param coords The original wall coordinates
     * @param pad    The amount of padding to apply
     * @return A constructed Polygon for the line
     */
    protected _getWallHitPolygon(coords: [number, number], pad: number): PIXI.Polygon;

    /** Given the properties of the wall - decide upon a color to render the wall for display on the WallsLayer */
    protected _getWallColor(): number;

    protected _onControl(options?: { releaseOthers?: boolean; chain?: number }): void;

    protected _onRelease(options: Record<string, unknown>): void;

    destroy(options: Record<string, unknown>): void;

    /**
     * Test whether the Wall direction lies between two provided angles
     * This test is used for collision and vision checks against one-directional walls
     * @param lower The lower-bound limiting angle in radians
     * @param upper The upper-bound limiting angle in radians
     */
    isDirectionBetweenAngles(lower: number, upper: number): boolean;

    /**
     * A simple test for whether a Ray can intersect a directional wall
     * @param ray The ray to test
     * @return Can an intersection occur?
     */
    canRayIntersect(ray: Ray): boolean;

    /**
     * Get an Array of Wall objects which are linked by a common coordinate
     * @returns An object reporting ids and endpoints of the linked segments
     */
    getLinkedSegments(): {
        ids: string[];
        walls: Wall[];
        endpoints: number[];
    };

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    override _onCreate(
        data: foundry.data.WallSource,
        options: DocumentModificationContext<TDocument>,
        userId: string
    ): void;

    override _onUpdate(
        changed: DocumentUpdateData,
        options: DocumentModificationContext<TDocument>,
        userId: string
    ): void;

    override _onDelete(options: DocumentModificationContext<TDocument>, userId: string): void;

    /**
     * Callback actions when a wall that contains a door is moved or its state is changed
     * @param doorChange Update vision and sound restrictions
     */
    protected _onModifyWall(doorChange?: boolean): void;

    /* -------------------------------------------- */
    /*  Interaction Event Callbacks                 */
    /* -------------------------------------------- */

    protected override _canControl(user: User, event?: PIXI.InteractionEvent): boolean;

    protected _onHoverIn(event: PIXI.InteractionEvent, options?: { hoverOutOthers?: boolean }): boolean;

    protected _onHoverOut(event: PIXI.InteractionEvent): boolean;

    /** Handle mouse-hover events on the line segment itself, pulling the Wall to the front of the container stack */
    protected _onMouseOverLine(event: PIXI.InteractionEvent): void;

    protected _onClickLeft(event: PIXI.InteractionEvent): boolean;

    protected _onClickLeft2(event: PIXI.InteractionEvent): boolean;

    protected _onClickRight2(event: PIXI.InteractionEvent): boolean;

    protected _onDragLeftStart(event: PIXI.InteractionEvent): boolean;

    protected _onDragLeftMove(event: PIXI.InteractionEvent): void;

    protected _onDragLeftDrop(event: PIXI.InteractionEvent): Promise<TDocument[]>;
}

declare interface Wall {
    get layer(): WallsLayer<this>;
}
