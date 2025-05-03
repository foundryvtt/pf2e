import AlphaBlurFilter from "@client/canvas/rendering/filters/blur.mjs";
import CachedContainer from "../../containers/advanced/cached-container.mjs";
import { CanvasVisionContainer } from "../_types.mjs";

/**
 * The vision mask which contains the current line-of-sight texture.
 * @category Canvas
 */
export default class CanvasVisionMask extends CachedContainer {
    static override textureConfiguration: {
        scaleMode: PIXI.SCALE_MODES.NEAREST;
        format: PIXI.FORMATS.RED;
        multisample: PIXI.MSAA_QUALITY.NONE;
    };

    override clearColor: [0, 0, 0, 0];

    override autoRender: false;

    /** The current vision Container. */
    vision: CanvasVisionContainer;

    /**
     * The BlurFilter which applies to the vision mask texture.
     * This filter applies a NORMAL blend mode to the container.
     */
    blurFilter: AlphaBlurFilter;

    draw(): Promise<void>;

    /**
     * Initialize the vision mask with the los and the fov graphics objects.
     * @param vision The vision container to attach
     * @returns The attached vision container.
     */
    attachVision(vision: PIXI.Container): CanvasVisionContainer;

    /**
     * Detach the vision mask from the cached container.
     * @returns The detached vision container.
     */
    detachVision(): CanvasVisionContainer;
}
