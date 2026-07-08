import BaseSamplerShader from "./base-sampler.mjs";

/**
 * A color adjustment shader.
 */
export default class ColorAdjustmentsSamplerShader extends BaseSamplerShader {
    static override classPluginName: null;

    static override defaultUniforms: {
        tintAlpha: number[];
        tint: number[];
        contrast?: number;
        saturation?: number;
        exposure?: number;
        sampler?: number | null;
        linkedToDarknessLevel?: boolean;
        darknessLevelTexture: null;
        screenDimensions: number[];
    };

    get linkedToDarknessLevel(): boolean;

    set linkedToDarknessLevel(link: boolean);

    get contrast(): number;

    set contrast(contrast: number);

    get exposure(): number;

    set exposure(exposure: number);

    get saturation(): number;

    set saturation(saturation: number);
}
