import AbstractBaseShader from "../base-shader.mjs";

/**
 * This class defines an interface which all adaptive lighting shaders extend.
 */
export default class AdaptiveLightingShader extends AbstractBaseShader {
    /**
     * Has this lighting shader a forced default color?
     */
    static forceDefaultColor: boolean;

    /**
     * Common attributes for vertex shaders.
     */
    static VERTEX_ATTRIBUTES: string;

    /**
     * Common uniforms for vertex shaders.
     */
    static VERTEX_UNIFORMS: string;

    /**
     * Common varyings shared by vertex and fragment shaders.
     */
    static VERTEX_FRAGMENT_VARYINGS: string;

    /**
     * Common functions used by the vertex shaders.
     */
    static VERTEX_FUNCTIONS: string;

    /**
     * Common uniforms shared by fragment shaders.
     */
    static FRAGMENT_UNIFORMS: string;

    /**
     * Common functions used by the fragment shaders.
     */
    static FRAGMENT_FUNCTIONS: string;

    static override CONSTANTS: string;

    /**
     * Construct adaptive shader according to shader type
     * @param shaderType shader type to construct : coloration, illumination, background, etc.
     * @returns the constructed shader adaptive block
     */
    static getShaderTechniques(shaderType: string): string;

    /**
     * The coloration technique coloration shader fragment
     */
    static get COLORATION_TECHNIQUES(): string;

    /**
     * The coloration technique illumination shader fragment
     */
    static get ILLUMINATION_TECHNIQUES(): string;

    /**
     * The coloration technique background shader fragment
     */
    static get BACKGROUND_TECHNIQUES(): string;

    /**
     * The adjustments made into fragment shaders
     */
    static get ADJUSTMENTS(): string;

    /**
     * Contrast adjustment
     */
    static CONTRAST: string;

    /**
     * Saturation adjustment
     */
    static SATURATION: string;

    /**
     * Exposure adjustment
     */
    static EXPOSURE: string;

    /**
     * Switch between an inner and outer color, by comparing distance from center to ratio
     * Apply a strong gradient between the two areas if attenuation uniform is set to true
     */
    static SWITCH_COLOR: string;

    /**
     * Shadow adjustment
     */
    static SHADOW: string;

    /**
     * Transition between bright and dim colors, if requested
     */
    static TRANSITION: string;

    /**
     * Incorporate falloff if a attenuation uniform is requested
     */
    static FALLOFF: string;

    /**
     * Compute illumination uniforms
     */
    static COMPUTE_ILLUMINATION: string;

    /**
     * Initialize fragment with common properties
     */
    static FRAGMENT_BEGIN: string;

    /**
     * Shader final
     */
    static FRAGMENT_END: string;

    /**
     * A mapping of available shader techniques
     */
    static SHADER_TECHNIQUES: Record<string, ShaderTechnique>;

    /** Called before rendering. */
    update(): void;
}

export type ShaderTechnique = {
    /**
     * The numeric identifier of the technique
     */
    id: number;
    /**
     * The localization string that labels the technique
     */
    label: string;
    /**
     * The coloration shader fragment when the technique is used
     */
    coloration?: string | undefined;
    /**
     * The illumination shader fragment when the technique is used
     */
    illumination?: string | undefined;
    /**
     * The background shader fragment when the technique is used
     */
    background?: string | undefined;
};
