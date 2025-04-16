/**
 * Abstract shader used for Adjust Darkness Level region behavior.
 * @abstract
 * @internal
 * @ignore
 */
export class AbstractDarknessLevelRegionShader extends RegionShader {
    /** @inheritDoc */
    static defaultUniforms: {
        bottom: number;
        top: number;
        depthTexture: null;
        canvasDimensions: number[];
        sceneDimensions: number[];
        screenDimensions: number[];
        tintAlpha: number[];
    };
    /**
     * The darkness level adjustment mode.
     * @type {number}
     */
    mode: number;
    /**
     * The darkness level modifier.
     * @type {number}
     */
    modifier: number;
    /**
     * Current darkness level of this mesh.
     * @type {number}
     */
    get darknessLevel(): number;
}
/**
 * Render the RegionMesh with darkness level adjustments.
 * @internal
 * @ignore
 */
export class AdjustDarknessLevelRegionShader extends AbstractDarknessLevelRegionShader {
    /** @inheritDoc */
    static defaultUniforms: {
        darknessLevel: number;
        bottom: number;
        top: number;
        depthTexture: null;
        canvasDimensions: number[];
        sceneDimensions: number[];
        screenDimensions: number[];
        tintAlpha: number[];
    };
}
/**
 * Render the RegionMesh with darkness level adjustments.
 * @internal
 * @ignore
 */
export class IlluminationDarknessLevelRegionShader extends AbstractDarknessLevelRegionShader {
}
import RegionShader from "./base.mjs";
