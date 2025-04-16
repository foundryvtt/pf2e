/**
 * Pulse animation illumination shader
 */
export class PulseIlluminationShader extends AdaptiveIlluminationShader {
}
/**
 * Pulse animation coloration shader
 */
export class PulseColorationShader extends AdaptiveColorationShader {
    /** @inheritdoc */
    static defaultUniforms: {
        pulse: number;
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
}
import AdaptiveIlluminationShader from "../illumination-lighting.mjs";
import AdaptiveColorationShader from "../coloration-lighting.mjs";
