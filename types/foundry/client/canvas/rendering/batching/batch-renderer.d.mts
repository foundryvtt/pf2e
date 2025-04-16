import BatchShaderGenerator from "./batch-shader-generator.mjs";

/**
 * A batch renderer with a customizable data transfer function to packed geometries.
 */
export default class BatchRenderer extends PIXI.BatchRenderer {
    /**
     * The batch shader generator class.
     */
    static shaderGeneratorClass: typeof BatchShaderGenerator;

    /**
     * The default uniform values for the batch shader.
     * @type {object | (maxTextures: number) => object}
     */
    static defaultUniforms: object | ((maxTextures: number) => object);

    // undocumented
    maxTextures: number;

    /**
     * The PackInterleavedGeometry function provided by the sampler.
     */
    protected _packInterleavedGeometry: Function | undefined;

    /**
     * The update function provided by the sampler and that is called just before a flush.
     */
    protected _preRenderBatch: (batchRenderer: BatchRenderer) => void | undefined;

    /**
     * Get the uniforms bound to this abstract batch renderer.
     */
    get uniforms(): object | undefined;

    /**
     * Number of reserved texture units reserved by the batch shader that cannot be used by the batch renderer.
     */
    get reservedTextureUnits(): number;

    set reservedTextureUnits(val: number);

    override setShaderGenerator(options?: { vertex?: string; fragment?: string; uniforms?: string }): void;

    shaderGenerator: BatchShaderGenerator;

    /**
     * This override allows to allocate a given number of texture units reserved for a custom batched shader.
     * These reserved texture units won't be used to batch textures for PIXI.Sprite or SpriteMesh.
     */
    override contextChange(): void;

    override onPrerender(): void;

    override start(): void;

    override packInterleavedGeometry(
        element: PIXI.IBatchableElement,
        attributeBuffer: PIXI.ViewableBuffer,
        indexBuffer: Uint16Array,
        aIndex: number,
        iIndex: number,
    ): void;

    /**
     * Verify if a PIXI plugin exists. Check by name.
     * @param name The name of the pixi plugin to check.
     * @returns True if the plugin exists, false otherwise.
     */
    static hasPlugin(name: string): boolean;
}
