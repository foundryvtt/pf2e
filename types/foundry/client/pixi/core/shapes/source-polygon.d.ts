import type { PolygonVertex } from "../../../../client-esm/canvas/edges/module.d.ts";
import type * as sources from "../../../../client-esm/canvas/sources/module.d.ts";

declare global {
    /** An extension of the default PIXI.Polygon which is used to represent the line of sight for a point source. */
    abstract class PointSourcePolygon extends PIXI.Polygon {
        /** The rectangular bounds of this polygon */
        bounds: PIXI.Rectangle;

        /** The origin point of the source polygon. */
        origin: Point;

        /** The configuration of this polygon. */
        config: PointSourcePolygonConfig;

        /** A cached array of SightRay objects used to compute the polygon. */
        rays?: Ray[];

        /** An indicator for whether this polygon is constrained by some boundary shape? */
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
         * @param origin      The origin source point
         * @param [config={}] Configuration options which customize the polygon computation
         * @returns The computed polygon instance
         */
        static create<T extends PointSourcePolygon>(
            this: ConstructorOf<T>,
            origin: Point,
            config?: PointSourcePolygonConfig,
        ): T;

        override contains(x: number, y: number): boolean;

        /* -------------------------------------------- */
        /*  Polygon Computation                         */
        /* -------------------------------------------- */

        /**
         * Compute the polygon using the origin and configuration options.
         * @returns The computed polygon
         */
        compute(): this;

        /** Perform the implementation-specific computation */
        protected abstract _compute(): void;

        /**
         * Customize the provided configuration object for this polygon type.
         * @param origin The provided polygon origin
         * @param config The provided configuration object
         */
        initialize(origin: Point, config: PointSourcePolygonConfig): void;

        /**
         * Apply a constraining boundary shape to an existing PointSourcePolygon.
         * Return a new instance of the polygon with the constraint applied.
         * The new instance is only a "shallow clone", as it shares references to component properties with the original.
         * @param constraint            The constraining boundary shape
         * @param [intersectionOptions] Options passed to the shape intersection method
         * @returns A new constrained polygon
         */
        applyConstraint(constraint?: PIXI.Circle | PIXI.Rectangle | PIXI.Polygon, intersectionOptions?: object): this;

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
    }

    interface PointSourcePolygonConfig {
        /** The type of polygon being computed */
        type?: WallRestrictionType;
        /** The angle of emission, if limited */
        angle?: number;
        /** The desired density of padding rays, a number per PI */
        density?: number;
        /** A limited radius of the resulting polygon */
        radius?: number;
        /** The direction of facing, required if the angle is limited*/
        rotation?: number;
        /** Display debugging visualization and logging for the polygon */
        debug?: boolean;
        /** Is this polygon constrained by any walls? */
        walls?: boolean;
        /** The object (if any) that spawned this polygon. */
        source?: sources.BaseEffectSource;
        /** Limiting polygon boundary shape*/
        boundaryShape?: (PIXI.Rectangle | PIXI.Circle | PIXI.Polygon)[];
    }
}
