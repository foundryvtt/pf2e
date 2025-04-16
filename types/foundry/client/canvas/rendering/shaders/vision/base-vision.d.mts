/**
 * This class defines an interface which all adaptive vision shaders extend.
 */
export default class AdaptiveVisionShader extends AdaptiveLightingShader {
    /**
     * A mapping of available shader techniques
     * @type {Record<string, ShaderTechnique>}
     */
    static SHADER_TECHNIQUES: Record<string, ShaderTechnique>;
}
import AdaptiveLightingShader from "../lighting/base-lighting.mjs";
