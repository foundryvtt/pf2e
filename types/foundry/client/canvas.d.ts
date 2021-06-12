interface CanvasDimensions {
    sceneWidth: number;
    sceneHeight: number;
    size: number;
    distance: number;
    shiftX: number;
    shiftY: number;
    ratio: number;
}

declare class Canvas<
    TScene extends Scene = Scene,
    TToken extends Token = Token,
    TLightingLayer extends LightingLayer = LightingLayer,
> {
    id: string;
    app: PIXI.Application;
    stage: PIXI.Container;
    hud: HeadsUpDisplay;
    perception: PerceptionManager;
    scene: TScene | null;
    dimensions: CanvasDimensions | null;
    grid: GridLayer | null;
    lighting: TLightingLayer | null;
    tokens: TokenLayer<TToken>;
    templates: TemplateLayer | null;

    /**
     * Track the timestamp of the last stage zoom operation
     */
    protected _zoomTime: number;

    /**
     * Track the last automatic pan time to throttle
     */
    protected _panTime: number;

    /**
     * An object of data which is temporarily cached to be reloaded after the canvas is drawn
     */
    protected _reload: { layer: string };

    /**
     * The singleton interaction manager instance which handles mouse workflows on the Canvas
     */
    mouseInteractionManager: MouseInteractionManager;

    /**
     * A flag for whether the game Canvas is ready to be used. False if the canvas is not yet drawn, true otherwise.
     */
    ready: boolean;

    /**
     * An Array of pending canvas operations which should trigger on the next re-paint
     */
    pendingOperations: object[];

    /**
     * A Set of unique pending operation names to ensure operations are only performed once
     */
    protected _pendingOperationNames: Set<string>;

    constructor();
}

declare type DrawnCanvas<T extends Canvas = Canvas> = {
    [K in keyof T]: NonNullable<T[K]>;
};
