// eslint-disable-next-line @typescript-eslint/no-unused-vars
import RegionMesh from "@client/canvas/placeables/regions/mesh.mjs";
import AbstractBaseShader from "../base-shader.mjs";

/**
 * The shader used by {@link RegionMesh}.
 */
export default class RegionShader extends AbstractBaseShader {
    static override fragmentShader: string;

    static override defaultUniforms: {
        canvasDimensions: number[];
        sceneDimensions: number[];
        screenDimensions: number[];
        tintAlpha: number[];
    };

    override _preRender(mesh: PIXI.Container, renderer: PIXI.Renderer): void;
}
