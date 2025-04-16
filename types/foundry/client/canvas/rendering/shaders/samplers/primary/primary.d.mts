/**
 * @import PrimarySpriteMesh from "@client/canvas/primary/primary-sprite-mesh.mjs";
 */
/**
 * The base shader class of {@link PrimarySpriteMesh}.
 */
export default class PrimaryBaseSamplerShader extends OccludableSamplerShader {
    /**
     * The depth shader class associated with this shader.
     * @type {typeof DepthSamplerShader}
     */
    static depthShaderClass: typeof DepthSamplerShader;
    /**
     * The depth shader associated with this shader.
     * The depth shader is lazily constructed.
     * @type {DepthSamplerShader}
     */
    get depthShader(): DepthSamplerShader;
    /**
     * One-time configuration that is called when the depth shader is created.
     * @param {DepthSamplerShader} depthShader    The depth shader
     * @protected
     */
    protected _configureDepthShader(depthShader: DepthSamplerShader): void;
    #private;
}
import OccludableSamplerShader from "./occlusion.mjs";
import DepthSamplerShader from "./depth.mjs";
