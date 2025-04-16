/**
 * The default coloration shader used by standard rendering and animations.
 * A fragment shader which creates a solid light source.
 */
export default class AdaptiveDarknessShader extends AdaptiveLightingShader {
    /** @override */
    static override defaultUniforms: {
        intensity: number;
        color: [number, number, number];
        screenDimensions: number[];
        time: number;
        primaryTexture: null;
        depthTexture: null;
        visionTexture: null;
        darknessLevelTexture: null;
        depthElevation: number;
        ambientBrightest: number[];
        ambientDarkness: number[];
        ambientDaylight: number[];
        weights: number[];
        dimLevelCorrection: number;
        brightLevelCorrection: number;
        borderDistance: number;
        darknessLevel: number;
        computeIllumination: boolean;
        globalLight: boolean;
        globalLightThresholds: number[];
        enableVisionMasking: boolean;
    };
    /**
     * Memory allocations for the Adaptive Background Shader
     * @type {string}
     */
    static SHADER_HEADER: string;
    /** @inheritdoc */
    static fragmentShader: string;
    /**
     * Flag whether the darkness shader is currently required.
     * Check vision modes requirements first, then
     * if key uniforms are at their default values, we don't need to render the background container.
     * @type {boolean}
     */
    get isRequired(): boolean;
}
import AdaptiveLightingShader from "./base-lighting.mjs";
