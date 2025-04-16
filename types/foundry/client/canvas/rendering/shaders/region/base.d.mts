/**
 * @import RegionMesh from "@client/canvas/placeables/regions/mesh.mjs";
 */
/**
 * The shader used by {@link RegionMesh}.
 */
export default class RegionShader extends AbstractBaseShader {
    /** @override */
    static override fragmentShader: string;
    /** @override */
    static override defaultUniforms: {
        canvasDimensions: number[];
        sceneDimensions: number[];
        screenDimensions: number[];
        tintAlpha: number[];
    };
    /** @override */
    override _preRender(mesh: any, renderer: any): void;
}
import AbstractBaseShader from "../base-shader.mjs";
