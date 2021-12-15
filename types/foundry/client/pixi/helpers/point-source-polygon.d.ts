export {};

declare global {
    /** An extension of the default PIXI.Polygon which is used to represent the line of sight for a point source. */
    abstract class PointSourcePolygon<TPointSource extends PointSource = PointSource> extends PIXI.Polygon {
        /** The origin point of the source polygon. */
        origin: PIXI.Point;

        /** The configuration of this polygon. */
        config: PointSourcePolygonConfig<TPointSource>;

        /** A cached array of SightRay objects used to compute the polygon. */
        rays: Ray[];

        /**
         * Compute the rectangular bounds for the Polygon.
         * @param points The initially provided array of coordinates
         * @returns The computed Rectangular bounds
         */
        protected _getBounds(points: number): PIXI.Rectangle;

        /**
         * Benchmark the performance of polygon computation for this source
         * @param iterations The number of test iterations to perform
         * @param args Arguments passed to the compute method
         */
        static benchmark(iterations: number, ...args: ConstructorParameters<typeof this>): void;

        /**
         * Compute the polygon given a point origin and radius
         * @param origin      The origin source point
         * @param [config={}] Configuration options which customize the polygon computation
         * @returns The computed polygon instance
         */
        static create(origin: Point, config?: PointSourcePolygonConfig): PointSourcePolygon;

        /**
         * Compute the polygon using the origin and configuration options.
         * @returns The computed polygon
         */
        compute(): this;

        /** Perform the implementation-specific computation */
        protected abstract _compute(): this;

        /**
         * Customize the provided configuration object for this polygon type.
         * @param origin The provided polygon origin
         * @param config The provided configuration object
         */
        initialize(origin: Point, config: PointSourcePolygonConfig<TPointSource>): void;

        /** Visualize the polygon, displaying its computed area, rays, and collision points */
        visualize(): void;
    }

    interface PointSourcePolygonConfig<T extends PointSource = PointSource> {
        /** The type of polygon being computed */
        type: string;
        /** The angle of emission, if limited */
        angle?: string;
        /** The desired density of padding rays, a number per PI */
        density?: number;
        /** A limited radius of the resulting polygon */
        radius?: number;
        /** The direction of facing, required if the angle is limited */
        rotation?: number;
        /** Display debugging visualization and logging for the polygon */
        debug?: boolean;
        /** Is this polygon constrained by any walls? */
        walls?: boolean;
        /** The object (if any) that spawned this polygon. */
        source?: T;
    }
}
