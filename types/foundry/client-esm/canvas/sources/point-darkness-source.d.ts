import type { Edge } from "../edges/edge.d.ts";
import type { PointEffectLightSource } from "./point-effect-source-mixes.d.ts";

export default class PointDarknessSource<
    TObject extends Token | AmbientLight | null,
> extends PointEffectLightSource<TObject> {
    /**
     * The optional geometric shape is solely utilized for visual representation regarding darkness sources.
     * Used only when an additional radius is added for visuals.
     */
    _visualShape: PointSourcePolygon;

    /**
     * Padding applied on the darkness source shape for visual appearance only.
     * Note: for now, padding is increased radius. It might evolve in a future release.
     */
    protected _padding: number;

    /** The Edge instances used by this darkness source */
    edges: Edge[];

    /* -------------------------------------------- */
    /*  Darkness Source Properties                  */
    /* -------------------------------------------- */

    /** A convenience accessor to the darkness layer mesh. */
    get darkness(): PointSourceMesh;

    /* -------------------------------------------- */
    /*  Shader Management                           */
    /* -------------------------------------------- */

    /** Update the uniforms of the shader on the darkness layer. */
    _updateDarknessUniforms(): void;
}
