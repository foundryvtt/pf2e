import VisualEffectsMaskingFilter from "@client/canvas/rendering/filters/effects-masking.mjs";
import CachedContainer from "../../containers/advanced/cached-container.mjs";
import SpriteMesh from "../../containers/elements/sprite-mesh.mjs";
import CanvasLayer from "../base/canvas-layer.mjs";

/**
 * A CanvasLayer for displaying illumination visual effects
 * @category Canvas
 */
export default class CanvasIlluminationEffects extends CanvasLayer {
    /** The filter used to mask visual effects on this layer */
    filter: VisualEffectsMaskingFilter;

    /** The container holding the lights. */
    lights: PIXI.Container;

    /** The base line mesh. */
    baselineMesh: SpriteMesh;

    /** The cached container holding the illumination meshes. */
    darknessLevelMeshes: DarknessLevelContainer;

    /** To know if dynamic darkness level is active on this scene. */
    get hasDynamicDarknessLevel(): boolean;

    /** The illumination render texture. */
    get renderTexture(): PIXI.RenderTexture;

    /** Clear illumination effects container */
    clear(): void;

    /**
     * Invalidate the cached container state to trigger a render pass.
     * @param [force=false] Force cached container invalidation?
     */
    invalidateDarknessLevelContainer(force?: boolean): void;

    protected override _draw(options?: object): Promise<void>;

    protected override _tearDown(options?: object): Promise<void>;
}

/**
 * Cached container used for dynamic darkness level. Display objects (of any type) added to this cached container will
 * contribute to computing the darkness level of the masked area. Only the red channel is utilized, which corresponds
 * to the desired darkness level. Other channels are ignored.
 */
export class DarknessLevelContainer extends CachedContainer {
    static override textureConfiguration: {
        scaleMode: PIXI.SCALE_MODES.NEAREST;
        format: PIXI.FORMATS.RED;
        multisample: PIXI.MSAA_QUALITY.NONE;
        mipmap: PIXI.MIPMAP_MODES.OFF;
    };
}
