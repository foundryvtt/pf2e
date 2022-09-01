export {};

declare global {
    /**
     * A simple shader to emulate a PIXI.Sprite with a PIXI.SpriteMesh
     * @todo Fill in
     */
    class BaseSamplerShader extends AbstractBaseShader {}

    /**
     * A color adjustment shader.
     * @todo Fill in
     */
    class ColorAdjustmentsSamplerShader extends BaseSamplerShader {}

    /**
     * A light amplification shader.
     * @todo Fill in
     */
    class AmplificationSamplerShader extends ColorAdjustmentsSamplerShader {}

    /**
     * A color adjustment shader.
     * @todo Fill in
     */
    class TokenInvisibilitySamplerShader extends BaseSamplerShader {}

    /**
     * A monochromatic shader.
     * @todo Fill in
     */
    class MonochromaticSamplerShader extends BaseSamplerShader {}

    /**
     * A shader used to control channels intensity using an externally provided mask texture.
     * @todo Fill in
     */
    class InverseOcclusionSamplerShader extends BaseSamplerShader {}

    /**
     * An occlusion shader to reveal certain area with elevation comparisons.
     * This shader is also working as a batched plugin.
     * @todo Fill in
     */
    class OcclusionSamplerShader extends BaseSamplerShader {}
}
