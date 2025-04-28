import AbstractBaseMaskFilter from "./base-mask-filter.mjs";

/**
 * A filter used to apply color adjustments and other modifications to the environment.
 */
export default class PrimaryCanvasGroupAmbienceFilter extends AbstractBaseMaskFilter {
    static override defaultUniforms: {
        uSampler: null;
        darknessLevelTexture: null;
        cycle: boolean;
        baseTint: number[];
        baseIntensity: number;
        baseLuminosity: number;
        baseSaturation: number;
        baseShadows: number;
        darkTint: number[];
        darkIntensity: number;
        darkLuminosity: number;
        darkSaturation: number;
        darkShadows: number;
    };
}
