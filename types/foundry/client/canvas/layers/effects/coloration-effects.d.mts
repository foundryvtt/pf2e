import VisualEffectsMaskingFilter from "@client/canvas/rendering/filters/effects-masking.mjs";
import CanvasLayer from "../base/canvas-layer.mjs";

/**
 * A CanvasLayer for displaying coloration visual effects
 * @category Canvas
 */
export default class CanvasColorationEffects extends CanvasLayer {
    override sortableChildren: true;

    /** The filter used to mask visual effects on this layer */
    filter: VisualEffectsMaskingFilter;

    /** Clear coloration effects container */
    clear(): void;

    protected override _draw(options?: object): Promise<void>;

    protected override _tearDown(options?: object): Promise<void>;
}
