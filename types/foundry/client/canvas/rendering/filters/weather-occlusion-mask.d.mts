/**
 * @import WeatherEffects from "@client/canvas/layers/effects/weather-effects.mjs";
 */
/**
 * The filter used by the weather layer to mask weather above occluded roofs.
 * @see {@link WeatherEffects}
 */
export default class WeatherOcclusionMaskFilter extends AbstractBaseMaskFilter {
    /** @override */
    static override defaultUniforms: {
        depthElevation: number;
        useOcclusion: boolean;
        occlusionTexture: null;
        reverseOcclusion: boolean;
        occlusionWeights: number[];
        useTerrain: boolean;
        terrainTexture: null;
        reverseTerrain: boolean;
        terrainWeights: number[];
        sceneDimensions: number[];
        sceneAnchor: number[];
        terrainUvMatrix: PIXI.Matrix;
    };
    /**
     * Elevation of this weather occlusion mask filter.
     * @type {number}
     */
    elevation: number;
}
import AbstractBaseMaskFilter from "./base-mask-filter.mjs";
