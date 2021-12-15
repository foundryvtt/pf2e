/**
 * The default coloration shader used by standard rendering and animations.
 * A fragment shader which creates a light source.
 */
declare class AdaptiveColorationShader extends AdaptiveLightingShader {
    /** Incorporate falloff if a falloff uniform is requested */
    static FALLOFF: string;

    /** Color adjustments : exposure, contrast and shadows */
    static ADJUSTMENTS: string;

    /** Memory allocations for the Adaptive Coloration Shader */
    static SHADER_HEADER: string;

    static override fragmentShader: string;

    static override defaultUniforms: DefaultShaderUniforms;
}
