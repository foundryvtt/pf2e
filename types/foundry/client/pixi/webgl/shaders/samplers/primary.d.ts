/**
 * The base shader class of {@link PrimarySpriteMesh}.
 */
declare class PrimaryBaseSamplerShader extends OccludableSamplerShader {
    /** The depth shader class associated with this shader. */
    static depthShaderClass: typeof DepthSamplerShader;

    /**
     * The depth shader associated with this shader.
     * The depth shader is lazily constructed.
     */
    get depthShader(): DepthSamplerShader;

    /**
     * One-time configuration that is called when the depth shader is created.
     * @param depthShader    The depth shader
     */
    protected _configureDepthShader(depthShader: DepthSamplerShader): void;
}
