interface CanvasDimensions {
    sceneWidth: number;
    sceneHeight: number;
    size: number;
    distance: number;
    shiftX: number;
    shiftY: number;
    ratio: number;
}

declare class Canvas<ActorType extends Actor = Actor> {
    dimensions: CanvasDimensions | null;
    grid: GridLayer;
    hud: HeadsUpDisplay;
    lighting: LightingLayer;
    scene: Scene | null;
    tokens: TokenLayer<ActorType>;
    templates: TemplateLayer;
    stage: PIXI.Container;
    app: PIXI.Application;

    /**
     * Return a reference to the active Canvas Layer
     */
    get activeLayer(): CanvasLayer | null;
}

declare type DrawnCanvas<A extends Actor = Actor> = {
    [K in keyof Canvas<A>]: NonNullable<Canvas<A>[K]>;
};
