export {};

/* eslint-disable @typescript-eslint/no-unsafe-function-type */

declare global {
    /**
     * The batch data that is needed by {@link DepthSamplerShader} to render an element with batching.
     * @typedef {object} DepthBatchData
     * @property {PIXI.Texture} _texture                       The texture
     * @property {Float32Array} vertexData                     The vertices
     * @property {Uint16Array|Uint32Array|number[]} indices    The indices
     * @property {Float32Array} uvs                            The texture UVs
     * @property {number} elevation                            The elevation
     * @property {number} textureAlphaThreshold                The texture alpha threshold
     * @property {number} fadeOcclusion                        The amount of FADE occlusion
     * @property {number} radialOcclusion                      The amount of RADIAL occlusion
     * @property {number} visionOcclusion                      The amount of VISION occlusion
     */

    /**
     * The depth sampler shader.
     */
    class DepthSamplerShader extends BaseSamplerShader {
        /* -------------------------------------------- */
        /*  Batched version Rendering                   */
        /* -------------------------------------------- */

        static override classPluginName: "batchDepth";

        static override batchGeometry:
            | PIXI.BatchGeometry
            | { id: string; size: number; normalized: boolean; type: PIXI.TYPES }[];

        static override batchVertexSize: number;

        static override reservedTextureUnits: number; // We need a texture unit for the occlusion texture

        static override defaultUniforms: {
            screenDimensions: [number, number];
            sampler: number | null;
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
            screenDimensions: [number, number];
            occlusionTexture: number;
        };

        protected static override _preRenderBatch(batchRenderer: BatchRenderer): void;

        static override _packInterleavedGeometry: Function | undefined;

        static override get batchVertexShader(): string;

        /** The batch vertex shader source. Subclasses can override it. */
        protected static _batchVertexShader: string;

        static override get batchFragmentShader(): string;

        /** The batch fragment shader source. Subclasses can override it. */
        protected static _batchFragmentShader: string;

        /* -------------------------------------------- */
        /*  Non-Batched version Rendering               */
        /* -------------------------------------------- */

        static override get vertexShader(): string;

        /** The vertex shader source. Subclasses can override it. */
        protected static _vertexShader: string;

        static override get fragmentShader(): string;
        /** The fragment shader source. Subclasses can override it. */
        protected static _fragmentShader: string;

        protected override _preRender(mesh: PIXI.Mesh, renderer: PIXI.Renderer): void;
    }
}
