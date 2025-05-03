import { ElevatedPoint, Point } from "@common/_types.mjs";
import { PointSourcePolygonConfig } from "../_types.mjs";
import PolygonVertex from "../edges/vertex.mjs";
import Ray from "./ray.mjs";

/**
 * An extension of Polygon which is used to represent the line of sight for a point source.
 */
export default abstract class PointSourcePolygon<
    TConfig extends PointSourcePolygonConfig = PointSourcePolygonConfig,
> extends PIXI.Polygon {
    /**
     * Customize how wall direction of one-way walls is applied
     */
    static WALL_DIRECTION_MODES: Readonly<{
        NORMAL: 0;
        REVERSED: 1;
        BOTH: 2;
    }>;

    /**
     * The rectangular bounds of this polygon
     */
    bounds: PIXI.Rectangle;

    /**
     * The origin point of the source polygon.
     */
    origin: ElevatedPoint;

    /**
     * The configuration of this polygon.
     */
    config: TConfig;

    /**
     * An indicator for whether this polygon is constrained by some boundary shape?
     */
    get isConstrained(): boolean;

    /**
     * Benchmark the performance of polygon computation for this source
     * @param iterations The number of test iterations to perform
     * @param origin The origin point to benchmark
     * @param config The polygon configuration to benchmark
     */
    static benchmark(iterations: number, origin: Point, config: PointSourcePolygonConfig): void;

    /**
     * Compute the polygon given a point origin and radius
     * @param origin The origin source point. The elevation defaults to
     *                                                the elevation of config.source if passed and otherwise 0.
     * @param config Configuration options which customize the polygon computation
     * @returns The computed polygon instance
     */
    static create<C extends PointSourcePolygonConfig, T extends PointSourcePolygon<C>>(
        this: ConstructorOf<T>,
        origin: Point,
        config?: C,
    ): T;

    /**
     * Create a clone of this polygon.
     * This overrides the default PIXI.Polygon#clone behavior.
     * @returns A cloned instance
     */
    override clone(): this;

    /* -------------------------------------------- */
    /*  Polygon Computation                         */
    /* -------------------------------------------- */

    /**
     * Compute the polygon using the origin and configuration options.
     * @returns The computed polygon
     */
    compute(): this;

    /**
     * Perform the implementation-specific computation
     */
    protected abstract _compute(): void;

    /**
     * Customize the provided configuration object for this polygon type.
     * @param origin The provided polygon origin
     * @param config The provided configuration object
     */
    initialize(origin: Point, config: TConfig): void;

    /**
     * Apply a constraining boundary shape to an existing PointSourcePolygon.
     * Return a new instance of the polygon with the constraint applied.
     * The new instance is only a "shallow clone", as it shares references to component properties with the original.
     * @param constraint            The constraining boundary shape
     * @param [intersectionOptions] Options passed to the shape intersection method
     * @returns A new constrained polygon
     */
    applyConstraint(constraint?: PIXI.Circle | PIXI.Rectangle | PIXI.Polygon, intersectionOptions?: object): this;

    override contains(x: number, y: number): boolean;

    /* -------------------------------------------- */
    /*  Polygon Boundary Constraints                */
    /* -------------------------------------------- */

    /**
     * Constrain polygon points by applying boundary shapes.
     */
    protected _constrainBoundaryShapes(): void;

    /* -------------------------------------------- */
    /*  Collision Testing                           */
    /* -------------------------------------------- */

    /**
     * Test whether a Ray between the origin and destination points would collide with a boundary of this Polygon
     * @param origin        An origin point
     * @param destination   A destination point
     * @param config        The configuration that defines a certain Polygon type
     * @param [config.mode] The collision mode to test: "any", "all", or "closest"
     * @returns The collision result depends on the mode of the test:
     *          * any: returns a boolean for whether any collision occurred
     *          * all: returns a sorted array of PolygonVertex instances
     *          * closest: returns a PolygonVertex instance or null
     */
    static testCollision(
        origin: Point,
        destination: Point,
        config?: PointSourcePolygonConfig & { mode: "closest" },
    ): PolygonVertex | null;
    static testCollision(
        origin: Point,
        destination: Point,
        config?: PointSourcePolygonConfig & { mode: "any" },
    ): boolean;
    static testCollision(
        origin: Point,
        destination: Point,
        config?: PointSourcePolygonConfig & { mode: "all" },
    ): PolygonVertex[];
    static testCollision(
        origin: Point,
        destination: Point,
        config?: PointSourcePolygonConfig & { mode?: "any" | "all" | "closest" },
    ): boolean | PolygonVertex | PolygonVertex[] | null;

    /**
     * Determine the set of collisions which occurs for a Ray.
     * @param ray  The Ray to test
     * @param mode The collision mode being tested
     * @returns The collision test result
     */
    protected abstract _testCollision(ray: Ray, mode: string): boolean | PolygonVertex | PolygonVertex[] | null;

    /* -------------------------------------------- */
    /*  Visualization and Debugging                 */
    /* -------------------------------------------- */

    /** Visualize the polygon, displaying its computed area, rays, and collision points */
    visualize(): void;

    /* -------------------------------------------- */
    /*  Threshold Polygons                          */
    /* -------------------------------------------- */

    /**
     * Augment a PointSourcePolygon by adding additional coverage for shapes permitted by threshold walls.
     * @param {PointSourcePolygon} polygon        The computed polygon
     * @returns {PointSourcePolygon}              The augmented polygon
     */
    static applyThresholdAttenuation<TPolygon extends PointSourcePolygon>(polygon: TPolygon): TPolygon;

    /**
     * Determine if the shape is a complete circle.
     * The config object must have an angle and a radius properties.
     */
    isCompleteCircle(): boolean;
}
