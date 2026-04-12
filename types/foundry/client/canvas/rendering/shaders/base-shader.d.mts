import BaseShaderMixin from "../mixins/base-shader-mixin.mjs";

/**
 * This class defines an interface which all shaders utilize.
 */
export default abstract class AbstractBaseShader extends BaseShaderMixin(PIXI.Shader) {
    constructor(program: PIXI.Program, uniforms?: PIXI.utils.Dict<unknown>);

    /**
     * The raw vertex shader used by this class.
     * A subclass of AbstractBaseShader must implement the vertexShader static field.
     */
    static vertexShader: string;

    /**
     * The raw fragment shader used by this class.
     * A subclass of AbstractBaseShader must implement the fragmentShader static field.
     */
    static fragmentShader: string | ((...args: unknown[]) => string);

    /**
     * The default uniform values for the shader.
     * A subclass of AbstractBaseShader must implement the defaultUniforms static field.
     */
    static defaultUniforms: object;

    /**
     * A factory method for creating the shader using its defined default values
     */
    static create(initialUniforms: object): AbstractBaseShader;

    /**
     * The initial values of the shader uniforms.
     */
    initialUniforms: object;

    /**
     * Reset the shader uniforms back to their initial values.
     */
    reset(): void;

    /**
     * A one time initialization performed on creation.
     */
    protected _configure(): void;

    /**
     * Perform operations which are required before binding the Shader to the Renderer.
     * @param mesh The mesh display object linked to this shader.
     * @param renderer The renderer
     * @protected
     */
    protected _preRender(mesh: PIXI.DisplayObject, renderer: PIXI.Renderer): void;
}
