import AdaptiveLightingShader, { ShaderTechnique } from "../lighting/base-lighting.mjs";

/**
 * This class defines an interface which all adaptive vision shaders extend.
 */
export default class AdaptiveVisionShader extends AdaptiveLightingShader {
    /**
     * A mapping of available shader techniques
     */
    static SHADER_TECHNIQUES: Record<string, ShaderTechnique>;
}
