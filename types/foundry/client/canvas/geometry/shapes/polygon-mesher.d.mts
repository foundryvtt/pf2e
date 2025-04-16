/**
 * A helper class used to construct triangulated polygon meshes
 * Allow to add padding and a specific depth value.
 */
export default class PolygonMesher {
    /**
     * Default options values
     */
    static _defaultOptions: Record<string, boolean | number>;

    /**
     * @param poly    Closed polygon to be processed and converted to a mesh (array of points or PIXI Polygon)
     * @param options Various options : normalizing, offsetting, add depth, ...
     */
    constructor(poly: number | PIXI.Polygon, options?: {});

    /**
     * Polygon mesh vertices
     */
    vertices: number[];

    /**
     * Polygon mesh indices
     */
    indices: number[];

    /**
     * Contains options to apply during the meshing process
     */
    options: Record<string, boolean | number>;

    /* -------------------------------------------- */
    /*  Polygon Mesher static helper methods        */
    /* -------------------------------------------- */

    /**
     * Convert a flat points array into a 2 dimensional ClipperLib path
     * @param poly
     * @param dimension
     * @returns The clipper lib path.
     */
    static getClipperPathFromPoints(poly: number[] | PIXI.Polygon, dimension?: number): unknown;

    /**
     * Execute the triangulation to create indices
     * @param geometry A geometry to update
     * @returns The resulting geometry
     */
    triangulate(geometry: PIXI.Geometry): PIXI.Geometry;
}
