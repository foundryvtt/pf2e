/**
 * @import {OccludableBatchData} from "../_types.mjs"
 */
/**
 * The occlusion sampler shader.
 */
export default class OccludableSamplerShader extends BaseSamplerShader {
    /**
     * The fragment shader code that applies occlusion.
     * @type {string}
     */
    static "__#65@#OCCLUSION": string;
    /** @override */
    static override classPluginName: string;
    /** @override */
    static override batchGeometry: {
        id: string;
        size: number;
        normalized: boolean;
        type: PIXI.TYPES;
    }[];
    /** @override */
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
    /** @override */
    static override batchDefaultUniforms(maxTex: any): {
        screenDimensions: number[];
        occlusionTexture: any;
    };
    /** @override */
    static override _preRenderBatch(batchRenderer: any): void;
    /** @override */
    static override _packInterleavedGeometry(element: any, attributeBuffer: any, indexBuffer: any, aIndex: any, iIndex: any): void;
    /** @override */
    static override get batchVertexShader(): string;
    /**
     * The batch vertex shader source. Subclasses can override it.
     * @type {string}
     * @protected
     */
    protected static _batchVertexShader: string;
    /** @override */
    static override get batchFragmentShader(): string;
    /**
     * The batch fragment shader source. Subclasses can override it.
     * @type {string}
     * @protected
     */
    protected static _batchFragmentShader: string;
    /** @override */
    static override get vertexShader(): string;
    /**
     * The vertex shader source. Subclasses can override it.
     * @type {string}
     * @protected
     */
    protected static _vertexShader: string;
    /** @override */
    static override get fragmentShader(): string;
    /**
     * The fragment shader source. Subclasses can override it.
     * @type {string}
     * @protected
     */
    protected static _fragmentShader: string;
}
import BaseSamplerShader from "../base-sampler.mjs";
