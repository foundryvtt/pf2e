/**
 * Alternative torch illumination shader
 */
export class FlameIlluminationShader extends AdaptiveIlluminationShader {
    /** @inheritdoc */
    static defaultUniforms: {
        brightnessPulse: number;
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
}
/**
 * Alternative torch coloration shader
 */
export class FlameColorationShader extends AdaptiveColorationShader {
    /** @inheritdoc */
    static defaultUniforms: {
        brightnessPulse: number;
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
