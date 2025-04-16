/**
 * The default coloration shader used by standard rendering and animations.
 * A fragment shader which creates a solid light source.
 */
export default class AdaptiveBackgroundShader extends AdaptiveLightingShader {
    /**
     * Memory allocations for the Adaptive Background Shader
     * @type {string}
     */
    static SHADER_HEADER: string;
    /** @inheritdoc */
    static fragmentShader: string;
    /** @override */
    static override defaultUniforms: {
        technique: number;
        contrast: number;
        shadows: number;
        saturation: number;
        intensity: number;
        attenuation: number;
        exposure: number;
        ratio: number;
        color: number[];
        colorBackground: number[];
        screenDimensions: number[];
        time: number;
        useSampler: boolean;
        primaryTexture: null;
        depthTexture: null;
        darknessLevelTexture: null;
        depthElevation: number;
        ambientBrightest: number[];
        ambientDarkness: number[];
        ambientDaylight: number[];
        weights: number[];
        dimLevelCorrection: number;
        brightLevelCorrection: number;
        computeIllumination: boolean;
        globalLight: boolean;
        globalLightThresholds: number[];
    };
    /**
     * Flag whether the background shader is currently required.
     * Check vision modes requirements first, then
     * if key uniforms are at their default values, we don't need to render the background container.
     * @type {boolean}
     */
    get isRequired(): boolean;
}
import AdaptiveLightingShader from "./base-lighting.mjs";
