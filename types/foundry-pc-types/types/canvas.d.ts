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
    scene: Scene;
    tokens: TokenLayer<ActorType>;
    templates: TemplateLayer;
}
