import Config from "@client/config.mjs";
import { ElevatedPoint } from "@common/_types.mjs";
import { PointSourceMesh } from "../containers/_module.mjs";
import { PointSourcePolygon, PointSourcePolygonConfig } from "../geometry/_module.mjs";
import { Token } from "../placeables/_module.mjs";
import AmbientLight from "../placeables/light.mjs";
import BaseLightSource, { LightSourceData } from "./base-light-source.mjs";
import PointEffectSourceMixin from "./point-effect-source.mjs";
import { RenderedEffectLayerConfig } from "./rendered-effect-source.mjs";

export default class PointDarknessSource<TObject extends Token | AmbientLight | null> extends PointEffectSourceMixin(
    BaseLightSource,
)<TObject> {
    static override sourceType: "darkness";

    static override effectsCollection: "darknessSources";

    protected static override _dimLightingLevel: number;

    protected static override _brightLightingLevel: number;

    static override get ANIMATIONS(): Config["Canvas"]["darknessAnimations"];

    protected static override get _layers(): Record<string, RenderedEffectLayerConfig>;

    /**
     * The optional geometric shape is solely utilized for visual representation regarding darkness sources.
     * Used only when an additional radius is added for visuals.
     */
    protected _visualShape: PointSourcePolygon;

    /**
     * Padding applied on the darkness source shape for visual appearance only.
     * Note: for now, padding is increased radius. It might evolve in a future release.
     */
    protected _padding: number;

    /* -------------------------------------------- */
    /*  Darkness Source Properties                  */
    /* -------------------------------------------- */

    override get requiresEdges(): true;

    /** A convenience accessor to the darkness layer mesh. */
    get darkness(): PointSourceMesh;

    /* -------------------------------------------- */
    /*  Visibility Testing                          */
    /* -------------------------------------------- */

    override testPoint(point: ElevatedPoint): boolean;

    /* -------------------------------------------- */
    /*  Source Initialization and Management        */
    /* -------------------------------------------- */

    protected override _initialize(data?: Partial<LightSourceData>): void;

    protected override _createShapes(): void;

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    protected override _drawMesh(layerId: string): Record<string, PIXI.Mesh | null>;

    protected override _updateGeometry(): void;

    /* -------------------------------------------- */
    /*  Shader Management                           */
    /* -------------------------------------------- */

    /** Update the uniforms of the shader on the darkness layer. */
    protected _updateDarknessUniforms(): void;
}
