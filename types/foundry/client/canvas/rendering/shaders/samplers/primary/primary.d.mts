// eslint-disable-next-line @typescript-eslint/no-unused-vars
import PrimarySpriteMesh from "@client/canvas/primary/primary-sprite-mesh.mjs";
import DepthSamplerShader from "./depth.mjs";
import OccludableSamplerShader from "./occlusion.mjs";

/**
 * The base shader class of {@link PrimarySpriteMesh}.
 */
export default class PrimaryBaseSamplerShader extends OccludableSamplerShader {
    /**
     * The depth shader class associated with this shader.
     */
    static depthShaderClass: typeof DepthSamplerShader;

    /**
     * The depth shader associated with this shader.
     * The depth shader is lazily constructed.
     */
    get depthShader(): DepthSamplerShader;

    /**
     * One-time configuration that is called when the depth shader is created.
     * @param {DepthSamplerShader} depthShader    The depth shader
     */
    protected _configureDepthShader(depthShader: DepthSamplerShader): void;
}
