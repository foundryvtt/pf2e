/**
 * The default illumination shader used by standard rendering and animations
 * A fragment shader which creates a solid light source.
 */
declare class AdaptiveIlluminationShader extends AdaptiveLightingShader {
    /** Constrain light to LOS */
    static CONSTRAIN_TO_LOS: string;

    /** Incorporate falloff if a gradual uniform is requested */
    static FALLOFF: string;

    /** Color adjustments : exposure, contrast and shadows */
    static ADJUSTMENTS: string;

    /** Memory allocations for the Adaptive Illumination Shader */
    static SHADER_HEADER: string;

    static override fragmentShader: string;

    static override defaultUniforms: DefaultShaderUniforms;

    /**
     * Determine the correct illumination penalty to apply for a given darkness level and luminosity
     * @param darknessLevel The current darkness level on [0,1]
     * @param luminosity    The light source luminosity on [-1,1]
     * @returns The amount of penalty to apply on [0,1]
     */
    getDarknessPenalty(darknessLevel: number, luminosity: number): number;
}
