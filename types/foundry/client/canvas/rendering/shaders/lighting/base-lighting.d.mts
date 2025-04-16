/**
 * @typedef {Object} ShaderTechnique
 * @property {number} id                       The numeric identifier of the technique
 * @property {string} label                    The localization string that labels the technique
 * @property {string} [coloration]             The coloration shader fragment when the technique is used
 * @property {string} [illumination]           The illumination shader fragment when the technique is used
 * @property {string} [background]             The background shader fragment when the technique is used
 */
/**
 * This class defines an interface which all adaptive lighting shaders extend.
 */
export default class AdaptiveLightingShader extends AbstractBaseShader {
    /**
     * Has this lighting shader a forced default color?
     * @type {boolean}
     */
    static forceDefaultColor: boolean;
    /**
     * Common attributes for vertex shaders.
     * @type {string}
     */
    static VERTEX_ATTRIBUTES: string;
    /**
     * Common uniforms for vertex shaders.
     * @type {string}
     */
    static VERTEX_UNIFORMS: string;
    /**
     * Common varyings shared by vertex and fragment shaders.
     * @type {string}
     */
    static VERTEX_FRAGMENT_VARYINGS: string;
    /**
     * Common functions used by the vertex shaders.
     * @type {string}
     * @abstract
     */
    static VERTEX_FUNCTIONS: string;
    /**
     * Common uniforms shared by fragment shaders.
     * @type {string}
     */
    static FRAGMENT_UNIFORMS: string;
    /**
     * Common functions used by the fragment shaders.
     * @type {string}
     * @abstract
     */
    static FRAGMENT_FUNCTIONS: string;
    /** @inheritdoc */
    static CONSTANTS: string;
    /**
     * Construct adaptive shader according to shader type
     * @param {string} shaderType  shader type to construct : coloration, illumination, background, etc.
     * @returns {string}           the constructed shader adaptive block
     */
    static getShaderTechniques(shaderType: string): string;
    /**
     * The coloration technique coloration shader fragment
     * @type {string}
     */
    static get COLORATION_TECHNIQUES(): string;
    /**
     * The coloration technique illumination shader fragment
     * @type {string}
     */
    static get ILLUMINATION_TECHNIQUES(): string;
    /**
     * The coloration technique background shader fragment
     * @type {string}
     */
    static get BACKGROUND_TECHNIQUES(): string;
    /**
     * The adjustments made into fragment shaders
     * @type {string}
     */
    static get ADJUSTMENTS(): string;
    /**
     * Contrast adjustment
     * @type {string}
     */
    static CONTRAST: string;
    /**
     * Saturation adjustment
     * @type {string}
     */
    static SATURATION: string;
    /**
     * Exposure adjustment
     * @type {string}
     */
    static EXPOSURE: string;
    /**
     * Switch between an inner and outer color, by comparing distance from center to ratio
     * Apply a strong gradient between the two areas if attenuation uniform is set to true
     * @type {string}
     */
    static SWITCH_COLOR: string;
    /**
     * Shadow adjustment
     * @type {string}
     */
    static SHADOW: string;
    /**
     * Transition between bright and dim colors, if requested
     * @type {string}
     */
    static TRANSITION: string;
    /**
     * Incorporate falloff if a attenuation uniform is requested
     * @type {string}
     */
    static FALLOFF: string;
    /**
     * Compute illumination uniforms
     * @type {string}
     */
    static COMPUTE_ILLUMINATION: string;
    /**
     * Initialize fragment with common properties
     * @type {string}
     */
    static FRAGMENT_BEGIN: string;
    /**
     * Shader final
     * @type {string}
     */
    static FRAGMENT_END: string;
    /**
     * A mapping of available shader techniques
     * @type {Record<string, ShaderTechnique>}
     */
    static SHADER_TECHNIQUES: Record<string, ShaderTechnique>;
    /** Called before rendering. */
    update(): void;
    /**
     * @deprecated since v12
     * @ignore
     */
    getDarknessPenalty(darknessLevel: any, luminosity: any): number;
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
import AbstractBaseShader from "../base-shader.mjs";
