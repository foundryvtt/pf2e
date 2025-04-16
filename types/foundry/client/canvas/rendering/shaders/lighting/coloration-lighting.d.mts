/**
 * The default coloration shader used by standard rendering and animations.
 * A fragment shader which creates a light source.
 */
export default class AdaptiveColorationShader extends AdaptiveLightingShader {
    /**
     * Memory allocations for the Adaptive Coloration Shader
     * @type {string}
     */
    static SHADER_HEADER: string;
    /** @inheritdoc */
    static fragmentShader: string;
    /** @inheritdoc */
    static defaultUniforms: {
        technique: number;
        shadows: number;
        contrast: number;
        saturation: number;
        colorationAlpha: number;
        intensity: number;
        attenuation: number;
        ratio: number;
        color: number[];
        time: number;
        hasColor: boolean;
        screenDimensions: number[];
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
     * Flag whether the coloration shader is currently required.
     * @type {boolean}
     */
    get isRequired(): boolean;
}
import AdaptiveLightingShader from "./base-lighting.mjs";
