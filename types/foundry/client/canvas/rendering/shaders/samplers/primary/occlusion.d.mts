import BaseSamplerShader from "../base-sampler.mjs";

/**
 * The occlusion sampler shader.
 */
export default class OccludableSamplerShader extends BaseSamplerShader {
    static override classPluginName: string;

    static override batchGeometry: {
        id: string;
        size: number;
        normalized: boolean;
        type: PIXI.TYPES;
    }[];

    static override defaultUniforms: {
        screenDimensions: number[];
        sampler: null;
        tintAlpha: number[];
        occlusionTexture: null;
        unoccludedAlpha: number;
        occludedAlpha: number;
        occlusionElevation: number;
        fadeOcclusion: number;
        radialOcclusion: number;
        visionOcclusion: number;
    };

    static override batchDefaultUniforms(maxTex: unknown): {
        screenDimensions: number[];
        occlusionTexture: unknown;
    };

    static override _preRenderBatch(batchRenderer: unknown): void;

    static override _packInterleavedGeometry(
        element: unknown,
        attributeBuffer: unknown,
        indexBuffer: unknown,
        aIndex: unknown,
        iIndex: unknown,
    ): void;

    static override get batchVertexShader(): string;

    /**
     * The batch vertex shader source. Subclasses can override it.
     */
    protected static _batchVertexShader: string;

    static override get batchFragmentShader(): string;
    /**
     * The batch fragment shader source. Subclasses can override it.
     */
    protected static _batchFragmentShader: string;

    static override get vertexShader(): string;

    /**
     * The vertex shader source. Subclasses can override it.
     */
    protected static _vertexShader: string;

    static override get fragmentShader(): string;

    /**
     * The fragment shader source. Subclasses can override it.
     */
    protected static _fragmentShader: string;
}
