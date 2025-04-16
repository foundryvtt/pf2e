import BaseShaderMixin from "../mixins/base-shader-mixin.mjs";

/**
 * This class defines an interface which all shaders utilize.
 */
export default abstract class AbstractBaseShader extends BaseShaderMixin(PIXI.Shader) {
    /**
     * The raw vertex shader used by this class.
     * A subclass of AbstractBaseShader must implement the vertexShader static field.
     * @type {string}
     */
    static vertexShader: string;
    /**
     * The raw fragment shader used by this class.
     * A subclass of AbstractBaseShader must implement the fragmentShader static field.
     * @type {string|(...args: any[]) => string}
     */
    static fragmentShader: string | ((...args: any[]) => string);
    /**
     * The default uniform values for the shader.
     * A subclass of AbstractBaseShader must implement the defaultUniforms static field.
     * @type {object}
     */
    static defaultUniforms: object;
    /**
     * A factory method for creating the shader using its defined default values
     * @param {object} initialUniforms
     * @returns {AbstractBaseShader}
     */
    static create(initialUniforms: object): AbstractBaseShader;
    constructor(program: any, uniforms: any);
    /**
     * The initial values of the shader uniforms.
     * @type {object}
     */
    initialUniforms: object;
    /**
     * Reset the shader uniforms back to their initial values.
     */
    reset(): void;
    /**
     * A one time initialization performed on creation.
     * @protected
     */
    protected _configure(): void;
    /**
     * Perform operations which are required before binding the Shader to the Renderer.
     * @param {PIXI.DisplayObject} mesh      The mesh display object linked to this shader.
     * @param {PIXI.Renderer} renderer       The renderer
     * @protected
     */
    protected _preRender(mesh: PIXI.DisplayObject, renderer: PIXI.Renderer): void;
    /**
     * @deprecated since v12
     * @ignore
     */
    get _defaults(): object;
}
