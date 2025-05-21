import { LightSourceAnimationConfig } from "@client/config.mjs";
import { Point } from "@common/_types.mjs";
import { LightingLevel } from "@common/constants.mjs";
import { PointSourceMesh } from "../containers/_module.mjs";
import { PointSourcePolygonConfig } from "../geometry/_types.mjs";
import BaseLightSource from "./base-light-source.mjs";
import PointEffectSourceMixin from "./point-effect-source.mjs";
import { RenderedEffectLayerConfig } from "./rendered-effect-source.mjs";

/**
 * A specialized subclass of the BaseLightSource which renders a source of darkness as a point-based effect.
 */
export default class PointDarknessSource extends PointEffectSourceMixin(BaseLightSource) {
    static override sourceType: "darkness";

    static override effectsCollection: "darknessSources";

    protected static override _dimLightingLevel: LightingLevel;

    protected static override _brightLightingLevel: LightingLevel;

    static override get ANIMATIONS(): LightSourceAnimationConfig;

    protected static override get _layers(): Record<string, RenderedEffectLayerConfig>;

    /**
     * The optional geometric shape is solely utilized for visual representation regarding darkness sources.
     * Used only when an additional radius is added for visuals.
     */
    protected _visualShape: PIXI.Polygon;

    /**
     * Padding applied on the darkness source shape for visual appearance only.
     * Note: for now, padding is increased radius. It might evolve in a future release.
     */
    protected _padding: number;

    /* -------------------------------------------- */
    /*  Darkness Source Properties                  */
    /* -------------------------------------------- */

    override get requiresEdges(): boolean;

    /**
     * A convenience accessor to the darkness layer mesh.
     */
    get darkness(): PointSourceMesh;

    /* -------------------------------------------- */
    /*  Visibility Testing                          */
    /* -------------------------------------------- */

    override testPoint(point: Point): boolean;

    /* -------------------------------------------- */
    /*  Source Initialization and Management        */
    /* -------------------------------------------- */

    protected override _initialize(data: Record<string, unknown>): void;

    protected override _createShapes(): void;

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    protected override _drawMesh(layerId: string): PIXI.Mesh;

    protected override _updateGeometry(): void;

    /* -------------------------------------------- */
    /*  Shader Management                           */
    /* -------------------------------------------- */

    /**
     * Update the uniforms of the shader on the darkness layer.
     */
    protected _updateDarknessUniforms(): void;
}
