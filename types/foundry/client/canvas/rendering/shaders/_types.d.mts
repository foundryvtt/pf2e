/**
 * The batch data that is needed by {@link DepthSamplerShader} to render an element with batching.
 */
export type DepthBatchData = {
    /**
     * The texture
     */
    _texture: PIXI.Texture;
    /**
     * The vertices
     */
    vertexData: Float32Array;
    /**
     * The indices
     */
    indices: Uint16Array | Uint32Array | number[];
    /**
     * The texture UVs
     */
    uvs: Float32Array;
    /**
     * The elevation
     */
    elevation: number;
    /**
     * The texture alpha threshold
     */
    textureAlphaThreshold: number;
    /**
     * The amount of FADE occlusion
     */
    fadeOcclusion: number;
    /**
     * The amount of RADIAL occlusion
     */
    radialOcclusion: number;
    /**
     * The amount of VISION occlusion
     */
    visionOcclusion: number;
};
/**
 * The batch data that is needed by {@link OccludableSamplerShader} to render an element with batching.
 */
export type OccludableBatchData = {
    /**
     * The texture
     */
    _texture: PIXI.Texture;
    /**
     * The vertices
     */
    vertexData: Float32Array;
    /**
     * The indices
     */
    indices: Uint16Array | Uint32Array | number[];
    /**
     * The texture UVs
     */
    uvs: Float32Array;
    /**
     * The world alpha
     */
    worldAlpha: number;
    /**
     * The tint
     */
    _tintRGB: number;
    /**
     * The blend mode
     */
    blendMode: number;
    /**
     * The elevation
     */
    elevation: number;
    /**
     * The unoccluded alpha
     */
    unoccludedAlpha: number;
    /**
     * The unoccluded alpha
     */
    occludedAlpha: number;
    /**
     * The amount of FADE occlusion
     */
    fadeOcclusion: number;
    /**
     * The amount of RADIAL occlusion
     */
    radialOcclusion: number;
    /**
     * The amount of VISION occlusion
     */
    visionOcclusion: number;
};
