declare class Canvas<
    TScene extends Scene = Scene,
    TToken extends Token = Token,
    TLightingLayer extends LightingLayer = LightingLayer,
> {
    constructor();

    /** A reference to the currently displayed Scene document, or null if the Canvas is currently blank. */
    scene: TScene | null;

    /** The current pixel dimensions of the displayed Scene, or null if the Canvas is blank. */
    dimensions: CanvasDimensions | null;

    /** A reference to the HeadsUpDisplay container which overlays HTML rendering on top of this Canvas. */
    hud: HeadsUpDisplay | null;

    /** An Array of pending canvas operations which should trigger on the next re-paint */
    pendingOperations: Record<string, unknown>[];

    /** A perception manager interface for batching lighting, sight, and sound updates */
    perception: PerceptionManager;

    /** A flag for whether the game Canvas is ready to be used. False if the canvas is not yet drawn, true otherwise. */
    ready: boolean;

    /** A flag for whether the game Canvas is initialized and ready for drawing. */
    initialized: boolean;

    /** Track the timestamp of the last stage zoom operation */
    protected _zoomTime: number;

    /** Track the last automatic pan time to throttle */
    protected _panTime: number;

    /** An object of data which is temporarily cached to be reloaded after the canvas is drawn */
    protected _reload: { layer: string };

    /** A Set of unique pending operation names to ensure operations are only performed once */
    protected _pendingOperationNames: Set<string>;

    /** The pixel radius of blur distance that should be applied for the current zoom level */
    blurDistance: number;

    /** An array of blur filter instances which are modified by the zoom level and the "soft shadows" setting */
    blurFilters: InstanceType<typeof PIXI.filters['BlurFilter']>[];

    /** The singleton interaction manager instance which handles mouse workflows on the Canvas */
    mouseInteractionManager: MouseInteractionManager;

    /** A reference to the MouseInteractionManager that is currently controlling pointer-based interaction, or null. */
    currentMouseManager: MouseInteractionManager | null;

    id: string;

    app: PIXI.Application;

    // Define the Stage
    stage: PIXI.Container;

    // Activate drop handling
    protected _dragDrop: DragDrop;

    msk: PIXI.Graphics;

    grid: GridLayer | null;
    lighting: TLightingLayer;
    tokens: TokenLayer<TToken>;
    templates: TemplateLayer | null;
    sight: SightLayer;

    _initiative(): void;
}

interface CanvasDimensions {
    distance: number;
    height: number;
    maxR: number;
    paddingX: number;
    paddingY: number;
    ratio: number;
    rect: PIXI.Rectangle;
    sceneHeight: number;
    sceneRect: PIXI.Rectangle;
    sceneWidth: number;
    shiftX: number;
    shiftY: number;
    size: number;
    width: number;
}

declare type DrawnCanvas<T extends Canvas = Canvas> = {
    [K in keyof T]: NonNullable<T[K]>;
};
