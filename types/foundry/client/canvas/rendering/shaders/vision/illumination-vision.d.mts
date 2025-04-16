/**
 * The default illumination shader used for vision sources
 */
export default class IlluminationVisionShader extends AdaptiveVisionShader {
    /**
     * Transition between bright and dim colors, if requested
     * @type {string}
     */
    static VISION_COLOR: string;
    /**
     * Memory allocations for the Adaptive Illumination Shader
     * @type {string}
     */
    static SHADER_HEADER: string;
    /** @inheritdoc */
    static fragmentShader: string;
    /** @inheritdoc */
    static defaultUniforms: {
        technique: any;
        attenuation: number;
        exposure: number;
        saturation: number;
        darknessLevel: number;
        colorVision: number[];
        colorTint: number[];
        colorBackground: number[];
        screenDimensions: number[];
        time: number;
        useSampler: boolean;
        linkedToDarknessLevel: boolean;
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
        globalLight: boolean;
        globalLightThresholds: number[];
    };
}
import AdaptiveVisionShader from "./base-vision.mjs";
