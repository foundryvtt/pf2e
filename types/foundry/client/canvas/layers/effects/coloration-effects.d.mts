import VisualEffectsMaskingFilter from "@client/canvas/rendering/filters/effects-masking.mjs";
import CanvasLayer from "../base/canvas-layer.mjs";

/**
 * A CanvasLayer for displaying coloration visual effects
 */
export default class CanvasColorationEffects extends CanvasLayer {
    constructor();

    /**
     * The filter used to mask visual effects on this layer
     */
    filter: VisualEffectsMaskingFilter;

    /**
     * Clear coloration effects container
     */
    clear(): void;

    protected override _draw(): Promise<void>;

    protected override _tearDown(): Promise<void>;
}
