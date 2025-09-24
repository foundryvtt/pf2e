import CanvasLayer from "../base/canvas-layer.mjs";

/**
 * A layer of background alteration effects which change the appearance of the primary group render texture.
 */
export default class CanvasDarknessEffects extends CanvasLayer {
    constructor();
    /**
     * Clear coloration effects container
     */
    clear(): void;

    protected override _draw(): Promise<void>;
}
