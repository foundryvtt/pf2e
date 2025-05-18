import AlphaBlurFilter from "@client/canvas/rendering/filters/blur.mjs";
import CachedContainer from "../../containers/advanced/cached-container.mjs";
import { CanvasVisionContainer } from "../_types.mjs";

/**
 * The vision mask which contains the current line-of-sight texture.
 */
export default class CanvasVisionMask extends CachedContainer {
    static override textureConfiguration: {
        multisample: PIXI.MSAA_QUALITY;
        scaleMode: PIXI.SCALE_MODES;
        format: PIXI.FORMATS;
        mipmap?: PIXI.MIPMAP_MODES;
    };

    override clearColor: [number, number, number, number];

    override autoRender: boolean;

    /**
     * The current vision Container.
     */
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
     */
    attachVision(vision: PIXI.Container): CanvasVisionContainer;

    /**
     * Detach the vision mask from the cached container.
     * @returns The detached vision container.
     */
    detachVision(): CanvasVisionContainer;
}
