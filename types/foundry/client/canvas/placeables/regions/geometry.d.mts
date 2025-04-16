import Region from "../region.mjs";

/**
 * The geometry of a {@link Region}.
 * - Vertex Attribute: `aVertexPosition` (`vec2`)
 * - Draw Mode: `PIXI.DRAW_MODES.TRIANGLES`
 */
export default class RegionGeometry extends PIXI.Geometry {
    /**
     * Create a RegionGeometry.
     * @param region The Region to create the RegionGeometry from.
     * @internal
     */
    constructor(region: Region);
    /**
     * The Region this geometry belongs to.
     */
    get region(): Region;
}
