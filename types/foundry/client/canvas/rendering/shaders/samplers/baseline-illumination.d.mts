import BaseSamplerShader from "./base-sampler.mjs";

/**
 * Compute baseline illumination according to darkness level encoded texture.
 */
export default class BaselineIlluminationSamplerShader extends BaseSamplerShader {
    static override defaultUniforms: {
        tintAlpha: number[];
        ambientDarkness: number[];
        ambientDaylight: number[];
        sampler: number | null;
    };

    static override classPluginName: null;
}
