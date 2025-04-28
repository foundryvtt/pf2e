import { Point } from "@common/_types.mjs";
import { SmoothGraphics } from "@pixi/graphics-smooth";
import PrimaryCanvasObjectMixin from "./primary-canvas-object.mjs";

/**
 * A basic PCO which is handling drawings of any shape.
 */
export default class PrimaryGraphics extends PrimaryCanvasObjectMixin(SmoothGraphics) {
    /**
     * @param options A config object
     * @param options.geometry A geometry passed to the graphics.
     * @param options.name The name of the PCO.
     * @param options.object Any object that owns this PCO.
     */
    constructor(options?: { geometry?: PIXI.GraphicsGeometry; name?: string | null; object?: object });

    override _calculateCanvasBounds(): void;

    override updateCanvasTransform(): void;

    override containsCanvasPoint(point: Point): boolean;
}
