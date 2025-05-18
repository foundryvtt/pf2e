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

    static override batchDefaultUniforms(maxTex: any): {
        screenDimensions: number[];
        occlusionTexture: any;
    };

    static override _preRenderBatch(batchRenderer: any): void;

    static override _packInterleavedGeometry(
        element: any,
        attributeBuffer: any,
        indexBuffer: any,
        aIndex: any,
        iIndex: any,
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
