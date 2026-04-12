import BaseSamplerShader from "../base-sampler.mjs";

/**
 * The depth sampler shader.
 */
export default class DepthSamplerShader extends BaseSamplerShader {
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
        occlusionTexture: null;
        textureAlphaThreshold: number;
        depthElevation: number;
        occlusionElevation: number;
        fadeOcclusion: number;
        radialOcclusion: number;
        visionOcclusion: number;
        restrictsLight: boolean;
        restrictsWeather: boolean;
    };

    static override batchDefaultUniforms(maxTex: number): {
        screenDimensions: number[];
        occlusionTexture: number;
    };

    static override _preRenderBatch(batchRenderer: PIXI.BatchRenderer): void;

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
