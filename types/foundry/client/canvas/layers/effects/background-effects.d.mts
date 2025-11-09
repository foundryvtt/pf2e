import CanvasLayer from "../base/canvas-layer.mjs";

/**
 * A layer of background alteration effects which change the appearance of the primary group render texture.
 */
export default class CanvasBackgroundAlterationEffects extends CanvasLayer {
    constructor();

    /**
     * A collection of effects which provide background vision alterations.
     */
    vision: PIXI.Container;

    /**
     * A collection of effects which provide background preferred vision alterations.
     */
    visionPreferred: PIXI.Container;

    /**
     * A collection of effects which provide other background alterations.
     */
    lighting: PIXI.Container;

    protected override _draw(): Promise<void>;

    protected override _tearDown(): Promise<void>;

    /**
     * Clear background alteration effects vision and lighting containers
     */
    clear(): void;
}
