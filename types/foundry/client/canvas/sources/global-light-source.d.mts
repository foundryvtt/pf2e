import AbstractBaseShader from "../rendering/shaders/base-shader.mjs";
import BaseLightSource, { LightSourceData } from "./base-light-source.mjs";

/**
 * A specialized subclass of the LightSource which is used to render global light source linked to the scene.
 */
export default class GlobalLightSource extends BaseLightSource<null> {
    static override sourceType: "GlobalLight";

    static override effectsCollection: "lightSources";

    static override defaultData: LightSourceData;

    /**
     * Name of this global light source.
     * @defaultValue GlobalLightSource.sourceType
     */
    name: string;

    /**
     * A custom polygon placeholder.
     */
    customPolygon: PIXI.Polygon | number[] | null;

    /* -------------------------------------------- */
    /*  Global Light Source Initialization          */
    /* -------------------------------------------- */

    protected override _createShapes(): void;

    protected override _initializeSoftEdges(): void;

    protected override _updateGeometry(): void;

    protected override _updateCommonUniforms(shader: AbstractBaseShader): void;
}
