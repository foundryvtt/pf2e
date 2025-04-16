/**
 * Shader for the Region highlight.
 * @internal
 * @ignore
 */
export default class HighlightRegionShader extends RegionShader {
    /** @inheritDoc */
    static defaultUniforms: {
        resolution: number;
        hatchEnabled: boolean;
        hatchThickness: number;
        canvasDimensions: number[];
        sceneDimensions: number[];
        screenDimensions: number[];
        tintAlpha: number[];
    };
}
import RegionShader from "./base.mjs";
