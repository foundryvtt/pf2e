import CanvasLayer from "../base/canvas-layer.mjs";

/**
 * A layer of background alteration effects which change the appearance of the primary group render texture.
 * @category Canvas
 */
export default class CanvasDarknessEffects extends CanvasLayer {
    override sortableChildren: true;

    /** Clear coloration effects container */
    clear(): void;

    protected override _draw(options?: object): Promise<void>;
}
