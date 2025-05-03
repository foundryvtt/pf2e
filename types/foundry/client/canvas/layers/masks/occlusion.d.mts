import { Token } from "@client/canvas/placeables/_module.mjs";
import CachedContainer from "../../containers/advanced/cached-container.mjs";

/**
 * The occlusion mask which contains radial occlusion and vision occlusion from tokens.
 * Red channel: Fade occlusion.
 * Green channel: Radial occlusion.
 * Blue channel: Vision occlusion.
 * @category Canvas
 */
export default class CanvasOcclusionMask<TObject extends Token = Token> extends CachedContainer {
    static override textureConfiguration: {
        scaleMode: PIXI.SCALE_MODES.NEAREST;
        format: PIXI.FORMATS.RGB;
        multisample: PIXI.MSAA_QUALITY.NONE;
    };

    /** Graphics in which token radial and vision occlusion shapes are drawn. */
    tokens: PIXI.Graphics;

    override clearColor: [0, 1, 1, 1];

    override autoRender: false;

    /** Is vision occlusion active? */
    get vision(): boolean;

    /** Clear the occlusion mask. */
    override clear(): this;

    /* -------------------------------------------- */
    /*  Occlusion Management                        */
    /* -------------------------------------------- */

    /**
     * Map an elevation to a value in the range [0, 1] with 8-bit precision.
     * The radial and vision shapes are drawn with these values into the render texture.
     * @param elevation The elevation in distance units
     * @returns The value for this elevation in the range [0, 1] with 8-bit precision
     */
    mapElevation(elevation: number): number;

    /**
     * Update the set of occludable Tokens, redraw the occlusion mask, and update the occluded state
     * of all occludable objects.
     */
    updateOcclusion(): void;

    /**
     * Draw occlusion shapes to the occlusion mask.
     * Fade occlusion draws to the red channel with varying intensity from [0, 1] based on elevation.
     * Radial occlusion draws to the green channel with varying intensity from [0, 1] based on elevation.
     * Vision occlusion draws to the blue channel with varying intensity from [0, 1] based on elevation.
     * @internal
     */
    _updateOcclusionMask(): void;

    /**
     * Update the current occlusion status of all Tile objects.
     * @internal
     */
    _updateOcclusionStates(): void;

    /**
     * Determine the set of objects which should be currently occluded by a Token.
     * @param tokens The set of currently controlled Token objects
     * @returns The PCO objects which should be currently occluded
     */
    protected _identifyOccludedObjects(tokens: TObject[]): Set<TObject>;
}
