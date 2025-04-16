import AdaptiveVisionShader from "./base-vision.mjs";

/**
 * The default background shader used for vision sources
 */
export default class BackgroundVisionShader extends AdaptiveVisionShader {
    static override defaultUniforms: {
        technique: number;
        saturation: number;
        contrast: number;
        attenuation: number;
        exposure: number;
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

    static override fragmentShader: string;

    /**
     * Memory allocations for the Adaptive Background Shader
     */
    static SHADER_HEADER: string;

    /**
     * Flag whether the background shader is currently required.
     * If key uniforms are at their default values, we don't need to render the background container.
     */
    get isRequired(): boolean;
}
