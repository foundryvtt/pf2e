/**
 * A simple shader which purpose is to make the original texture red channel the alpha channel,
 * and still keeping channel informations. Used in cunjunction with the AlphaBlurFilterPass and Fog of War.
 */
export default class FogSamplerShader extends BaseSamplerShader {
    /** @override */
    static override classPluginName: null;
}
import BaseSamplerShader from "./base-sampler.mjs";
