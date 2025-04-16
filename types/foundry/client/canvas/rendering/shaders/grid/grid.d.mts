/**
 * @import GridMesh from "@client/canvas/containers/elements/grid-mesh.mjs";
 */
/**
 * The grid shader used by {@link GridMesh}.
 */
export default class GridShader extends AbstractBaseShader {
    /**
     * The grid type uniform.
     * @type {string}
     */
    static TYPE_UNIFORM: string;
    /**
     * The grid thickness uniform.
     * @type {string}
     */
    static THICKNESS_UNIFORM: string;
    /**
     * The grid color uniform.
     * @type {string}
     */
    static COLOR_UNIFORM: string;
    /**
     * The resolution (pixels per grid space units) uniform.
     * @type {string}
     */
    static RESOLUTION_UNIFORM: string;
    /**
     * The antialiased step function.
     * The edge and x values is given in grid space units.
     * @type {string}
     */
    static ANTIALIASED_STEP_FUNCTION: string;
    /**
     * The line converage function, which returns the alpha value at a point with the given distance (in grid space units)
     * from an antialiased line (or point) with the given thickness (in grid space units).
     * @type {string}
     */
    static LINE_COVERAGE_FUNCTION: string;
    /**
     * Hexagonal functions conversion for between grid and cube space.
     * @type {string}
     */
    static HEXAGONAL_FUNCTIONS: string;
    /**
     * Get the nearest vertex of a grid space to the given point.
     * @type {string}
     */
    static NEAREST_VERTEX_FUNCTION: string;
    /**
     * This function returns the distance to the nearest edge of a grid space given a point.
     * @type {string}
     */
    static EDGE_DISTANCE_FUNCTION: string;
    /**
     * This function returns an vector (x, y, z), where
     * - x is the x-offset along the nearest edge,
     * - y is the y-offset (the distance) from the nearest edge, and
     * - z is the length of the nearest edge.
     * @type {string}
     */
    static EDGE_OFFSET_FUNCTION: string;
    /**
     * A function that draws the grid given a grid point, style, thickness, and color.
     * @type {string}
     */
    static DRAW_GRID_FUNCTION: string;
    /** @override */
    static override get fragmentShader(): string;
    /**
     * The fragment shader source. Subclasses can override it.
     * @type {string}
     * @protected
     */
    protected static _fragmentShader: string;
    /** @override */
    static override defaultUniforms: {
        canvasDimensions: number[];
        meshDimensions: number[];
        sceneDimensions: number[];
        screenDimensions: number[];
        gridSize: number;
        type: number;
        thickness: number;
        resolution: number;
        color: number[];
        alpha: number;
        style: number;
    };
    /**
     * Configure the shader.
     * @param {object} options
     */
    configure(options: object): void;
    /** @override */
    override _preRender(mesh: any, renderer: any): void;
    #private;
}
import AbstractBaseShader from "../base-shader.mjs";
