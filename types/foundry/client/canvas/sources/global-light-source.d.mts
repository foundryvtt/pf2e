import Config from "@client/config.mjs";
import BaseLightSource, { LightSourceData } from "./base-light-source.mjs";
import PointEffectSourceMixin from "./point-effect-source.mts";

/**
 * A specialized subclass of the LightSource which is used to render global light source linked to the scene.
 */
export default class GlobalLightSource extends PointEffectSourceMixin(BaseLightSource)<null> {
    static override sourceType: "GlobalLight";

    static override effectsCollection: "lightSources";

    static override defaultData: LightSourceData;

    protected static override get ANIMATIONS(): Config["Canvas"]["lightAnimations"];

    /**
     * Name of this global light source.
     * @defaultValue GlobalLightSource.sourceType
     */
    name: string;

    /** A custom polygon placeholder. */
    customPolygon: PIXI.Polygon | number[] | null;

    /* -------------------------------------------- */
    /*  Global Light Source Initialization          */
    /* -------------------------------------------- */

    protected override _createShapes(): void;

    protected override _initializeSoftEdges(): void;

    override _updateGeometry(): void;

    protected override _updateCommonUniforms(shader: PIXI.Shader): void;
}
