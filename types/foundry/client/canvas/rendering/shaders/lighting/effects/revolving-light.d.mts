/**
 * Revolving animation coloration shader
 */
export class RevolvingColorationShader extends AdaptiveColorationShader {
    /** @inheritdoc */
    static defaultUniforms: {
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
import AdaptiveColorationShader from "../coloration-lighting.mjs";
