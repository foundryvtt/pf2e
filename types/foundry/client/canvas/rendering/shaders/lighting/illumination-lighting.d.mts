/**
 * The default coloration shader used by standard rendering and animations.
 * A fragment shader which creates a solid light source.
 */
export default class AdaptiveIlluminationShader extends AdaptiveLightingShader {
    /**
     * Memory allocations for the Adaptive Illumination Shader
     * @type {string}
     */
    static SHADER_HEADER: string;
    /** @override */
    static override fragmentShader: string;
    /** @inheritDoc */
    static defaultUniforms: {
        technique: number;
        shadows: number;
        saturation: number;
        intensity: number;
        attenuation: number;
        contrast: number;
        exposure: number;
        ratio: number;
        darknessLevel: number;
        color: number[];
        colorBackground: number[];
        colorDim: number[];
        colorBright: number[];
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
     * Flag whether the illumination shader is currently required.
     * @type {boolean}
     */
    get isRequired(): boolean;
}
import AdaptiveLightingShader from "./base-lighting.mjs";
