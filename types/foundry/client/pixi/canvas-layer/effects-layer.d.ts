/**
 * A CanvasLayer for displaying visual effects like weather, transitions, flashes, or more
 * @todo: fill in
 */
declare class EffectsLayer<TToken extends Token> extends CanvasLayer {
    /** The weather overlay container */
    weather: PIXI.Container;

    visionSources: Collection<VisionSource<TToken>>;
}
