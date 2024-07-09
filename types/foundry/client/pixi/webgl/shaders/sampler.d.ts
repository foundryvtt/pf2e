export {};

declare global {
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
     * This class defines an interface which all adaptive lighting shaders extend.
     * @todo Fill in
     */
    class AdaptiveLightingShader extends AbstractBaseShader {
        static SHADER_TECHNIQUES: Record<string, { label: string }>;
    }

    class AdaptiveVisionShader extends AdaptiveLightingShader {}
}
