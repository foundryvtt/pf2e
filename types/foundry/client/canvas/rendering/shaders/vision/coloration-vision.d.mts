/**
 * The default coloration shader used for vision sources.
 */
export default class ColorationVisionShader extends AdaptiveVisionShader {
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
        saturation: number;
        attenuation: number;
        colorEffect: number[];
        colorBackground: number[];
        colorTint: number[];
        time: number;
        screenDimensions: number[];
        useSampler: boolean;
        primaryTexture: null;
        linkedToDarknessLevel: boolean;
        depthTexture: null;
        depthElevation: number;
        ambientBrightest: number[];
        ambientDarkness: number[];
        ambientDaylight: number[];
        weights: number[];
        dimLevelCorrection: number;
        brightLevelCorrection: number;
        globalLight: boolean;
        globalLightThresholds: number[];
    };
    /**
     * Flag whether the coloration shader is currently required.
     * If key uniforms are at their default values, we don't need to render the coloration container.
     * @type {boolean}
     */
    get isRequired(): boolean;
}
import AdaptiveVisionShader from "./base-vision.mjs";
