export {};

/* eslint-disable @typescript-eslint/no-unsafe-function-type */

declare global {
    /**
     * The occlusion sampler shader.
     */
    class OccludableSamplerShader extends BaseSamplerShader {
        /* -------------------------------------------- */
        /*  Batched version Rendering                   */
        /* -------------------------------------------- */

        static override classPluginName: "batchOcclusion";

        static override batchGeometry: { id: string; size: number; normalized: boolean; type: PIXI.TYPES }[];

        static override batchVertexSize: number;

        static override reservedTextureUnits: number; // We need a texture unit for the occlusion texture

        static override defaultUniforms: {
            screenDimensions: [number, number];
            sampler: number | null;
            tintAlpha: [number, number, number, number];
            occlusionTexture: null;
            unoccludedAlpha: number;
            occludedAlpha: number;
            occlusionElevation: number;
            fadeOcclusion: number;
            radialOcclusion: number;
            visionOcclusion: number;
        };

        static override batchDefaultUniforms(maxTex: number): {
            screenDimensions: [number, number];
            occlusionTexture: number;
        };

        protected static override _preRenderBatch(batchRenderer: BatchRenderer): void;

        protected static override _packInterleavedGeometry: Function | undefined;

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

    /** The batch data that is needed by {@link OccludableSamplerShader} to render an element with batching. */
    interface OccludableBatchData {
        _texture: PIXI.Texture;
        vertexData: Float32Array;
        indices: Uint16Array | Uint32Array | number[];
        uvs: Float32Array;
        worldAlpha: number;
        _tintRGB: number;
        blendMode: number;
        elevation: number;
        unoccludedAlpha: number;
        occludedAlpha: number;
        fadeOcclusion: number;
        radialOcclusion: number;
        visionOcclusion: number;
    }
}
