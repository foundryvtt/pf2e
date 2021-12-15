/**
 * The default coloration shader used by standard rendering and animations
 * A fragment shader which creates a solid light source.
 */
declare class AdaptiveBackgroundShader extends AdaptiveLightingShader {
    /** Constrain light to LOS */
    static CONSTRAIN_TO_LOS: string;

    /** Color adjustments : exposure, contrast and shadows */
    static ADJUSTMENTS: string;

    /** Incorporate falloff if a gradual uniform is requested */
    static FALLOFF: string;

    /** Memory allocations for the Adaptive Background Shader */
    static SHADER_HEADER: string;

    static override fragmentShader: string;

    static override defaultUniforms: DefaultShaderUniforms;

    /**
     * Flag whether the background shader is currently required.
     * If key uniforms are at their default values, we don't need to render the background container.
     */
    get isRequired(): boolean;
}
