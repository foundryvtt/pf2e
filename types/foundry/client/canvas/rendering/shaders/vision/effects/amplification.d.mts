import BackgroundVisionShader from "../background-vision.mjs";

/**
 * Shader specialized in light amplification
 */
export class AmplificationBackgroundVisionShader extends BackgroundVisionShader {
    static override defaultUniforms: {
        colorTint: number[];
        brightness: number;
        technique: number;
        saturation: number;
        contrast: number;
        attenuation: number;
        exposure: number;
        darknessLevel: number;
        colorVision: number[];
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
