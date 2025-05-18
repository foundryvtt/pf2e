import BatchRenderer from "../../batching/batch-renderer.mjs";
import BatchShaderGenerator from "../../batching/batch-shader-generator.mjs";
import AbstractBaseShader from "../base-shader.mjs";

/**
 * The base sampler shader exposes a simple sprite shader and all the framework to handle:
 * - Batched shaders and plugin subscription
 * - Configure method (for special processing done once or punctually)
 * - Update method (pre-binding, normally done each frame)
 * All other sampler shaders (batched or not) should extend BaseSamplerShader
 */
export default class BaseSamplerShader extends AbstractBaseShader {
    static override defaultUniforms: {
        sampler?: number | null;
        tintAlpha?: number[];
    };

    /**
     * The named batch sampler plugin that is used by this shader, or null if no batching is used.
     */
    static classPluginName: string | null;

    /**
     * Is this shader pausable or not?
     */
    static pausable: boolean;
    /**
     * Contrast adjustment
     */
    static CONTRAST: string;

    /**
     * Saturation adjustment
     */
    static SATURATION: string;

    /**
     * Exposure adjustment.
     */
    static EXPOSURE: string;

    /**
     * The adjustments made into fragment shaders.
     */
    static get ADJUSTMENTS(): string;

    static override fragmentShader: string;

    /**
     * The batch vertex shader source.
     */
    static batchVertexShader: string;
    /**
     * The batch fragment shader source.
     */
    static batchFragmentShader: string;

    /**
     * Batch geometry associated with this sampler.
     */
    static batchGeometry:
        | typeof PIXI.BatchGeometry
        | { id: string; size: number; normalized: boolean; type: PIXI.TYPES }[];

    /**
     * The size of a vertice with all its packed attributes.
     */
    static batchVertexSize: number;

    /**
     * Pack interleaved geometry custom function.
     */
    protected static _packInterleavedGeometry: Function | undefined;

    /**
     * A prerender function happening just before the batch renderer is flushed.
     */
    protected static _preRenderBatch: (batchRenderer: BatchRenderer) => void | undefined;

    /**
     * Returns default uniforms associated with the batched version of this sampler.
     */
    static batchDefaultUniforms: object | ((maxTextures: number) => object);

    /**
     * The number of reserved texture units for this shader that cannot be used by the batch renderer.
     */
    static reservedTextureUnits: number;

    /**
     * Initialize the batch geometry with custom properties.
     */
    static initializeBatchGeometry(): void;

    /**
     * The batch renderer to use.
     */
    static batchRendererClass: typeof BatchRenderer;
    /**
     * The batch generator to use.
     * @type {typeof BatchShaderGenerator}
     */
    static batchShaderGeneratorClass: typeof BatchShaderGenerator;
    /**
     * Create a batch plugin for this sampler class.
     * @returns The batch plugin class linked to this sampler class.
     */
    static createPlugin(): typeof BatchRenderer;

    /**
     * Register the plugin for this sampler.
     * @param options The options
     * @param options.force Override the plugin of the same name that is already registered?
     */
    static registerPlugin({ force }?: { force?: boolean }): void;

    /**
     * The plugin name associated for this instance, if any.
     * Returns "batch" if the shader is disabled.
     * @type {string|null}
     */
    get pluginName(): string | null;

    /**
     * Activate or deactivate this sampler. If set to false, the batch rendering is redirected to "batch".
     * Otherwise, the batch rendering is directed toward the instance pluginName (might be null)
     * @type {boolean}
     */
    get enabled(): boolean;

    set enabled(enabled: boolean);

    /**
     * Pause or Unpause this sampler. If set to true, the shader is disabled. Otherwise, it is enabled.
     * Contrary to enabled, a shader might decide to refuse a pause, to continue to render animations per example.
     * @see {enabled}
     */
    get paused(): boolean;

    set paused(paused: boolean);

    protected override _preRender(mesh: any, renderer: any): void;
}
