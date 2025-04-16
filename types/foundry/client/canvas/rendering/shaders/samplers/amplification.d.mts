import ColorAdjustmentsSamplerShader from "./color-adjustments.mjs";

/**
 * A light amplification shader.
 */
export default class AmplificationSamplerShader extends ColorAdjustmentsSamplerShader {
    static override defaultUniforms: {
        tintAlpha: number[];
        tint: number[];
        brightness: number;
        darknessLevelTexture: null;
        screenDimensions: number[];
        enable: boolean;
    };

    /**
     * Brightness controls the luminosity.
     */
    get brightness(): number;

    set brightness(brightness: number);

    /**
     * Tint color applied to Light Amplification.
     * (default: [0.48, 1.0, 0.48]).
     */
    get colorTint(): number[];

    set colorTint(color: number[]);
}
