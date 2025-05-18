import { CachedContainer, SpriteMesh } from "@client/canvas/containers/_module.mjs";

/**
 * The depth mask which contains a mapping of elevation. Needed to know if we must render objects according to depth.
 * Red channel: Lighting occlusion (top).
 * Green channel: Lighting occlusion (bottom).
 * Blue channel: Weather occlusion.
 * @category Canvas
 */
export default class CanvasDepthMask extends CachedContainer {
    constructor(sprite: PIXI.Sprite | SpriteMesh);

    /**
     * Container in which roofs are rendered with depth data.
     */
    roofs: PIXI.Container;

    static override textureConfiguration: {
        multisample: PIXI.MSAA_QUALITY;
        scaleMode: PIXI.SCALE_MODES;
        format: PIXI.FORMATS;
        mipmap?: PIXI.MIPMAP_MODES;
    };

    override clearColor: [number, number, number, number];

    /**
     * Update the elevation-to-depth mapping?
     * @internal
     */
    _elevationDirty: boolean;

    /**
     * Map an elevation to a value in the range [0, 1] with 8-bit precision.
     * The depth-rendered object are rendered with these values into the render texture.
     * @param elevation The elevation in distance units
     * @returns The value for this elevation in the range [0, 1] with 8-bit precision
     */
    mapElevation(elevation: number): number;

    /**
     * Update the elevation-to-depth mapping.
     * Needs to be called after the children have been sorted
     * and the canvas transform phase.
     * @internal
     */
    _update(): void;

    /**
     * Clear the depth mask.
     */
    clear(): this;
}
