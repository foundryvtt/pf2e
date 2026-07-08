import BaseSamplerShader from "./base-sampler.mjs";

/**
 * A colorization shader which keeps brightness contrary to "normal tinting"
 */
export default class ColorizeBrightnessShader extends BaseSamplerShader {
    static override classPluginName: null;

    static override defaultUniforms: {
        tintAlpha: number[];
        tintLinear: number[];
        sampler: null;
        screenDimensions: number[];
        grey: boolean;
        intensity: number;
    };
}
