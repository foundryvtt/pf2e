/**
 * Siren light animation coloration shader
 */
export class SirenColorationShader extends AdaptiveColorationShader {
    /** @inheritDoc */
    static defaultUniforms: {
        ratio: number;
        brightnessPulse: number;
        angle: number;
        gradientFade: number;
        beamLength: number;
        technique: number;
        shadows: number;
        contrast: number;
        saturation: number;
        colorationAlpha: number;
        intensity: number;
        attenuation: number;
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
/**
 * Siren light animation illumination shader
 */
export class SirenIlluminationShader extends AdaptiveIlluminationShader {
    /** @inheritDoc */
    static defaultUniforms: {
        angle: number;
        gradientFade: number;
        beamLength: number;
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
import AdaptiveColorationShader from "../coloration-lighting.mjs";
import AdaptiveIlluminationShader from "../illumination-lighting.mjs";
