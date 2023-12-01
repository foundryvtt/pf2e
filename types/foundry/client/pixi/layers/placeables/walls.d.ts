export {};

declare global {
    /** The Walls canvas layer which provides a container for Wall objects within the rendered Scen */
    class WallsLayer<
        TObject extends Wall<WallDocument<Scene | null>> = Wall<WallDocument<Scene | null>>,
    > extends PlaceablesLayer<TObject> {
        constructor();

        override quadtree: CanvasQuadtree<TObject>;

        /** A graphics layer used to display chained Wall selection */
        chain: PIXI.Graphics;

        /**
         * An array of all the unique perception-blocking endpoints which are present in the layer
         * We keep this array cached for faster sight polygon computations
         */
        endpoints: PointArray[];

        /** Track whether we are currently within a chained placement workflow */
        protected _chain: boolean;

        /**
         * Track whether the layer is currently toggled to snap at exact grid precision
         */
        protected _forceSnap: boolean;

        /** Track the most recently created or updated wall data for use with the clone tool */
        protected _cloneType: foundry.documents.WallSource;

        /** Reference the last interacted wall endpoint for the purposes of chaining */
        last: { id: string | null; point: PointArray };

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        static override get layerOptions(): WallsLayerOptions;

        static documentName: "Wall";

        /** An Array of Wall instances in the current Scene which act as Doors. */
        get doors(): TObject[];

        /** Gate the precision of wall snapping to become less precise for small scale maps. */
        get gridPrecision(): number;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        override draw(): Promise<this>;

        override deactivate(): this;

        /**
         * Perform initialization steps for the WallsLayer whenever the composition of walls in the Scene is changed.
         * Cache unique wall endpoints and identify interior walls using overhead roof tiles.
         */
        initialize(): void;

        /** Identify walls which are treated as "interior" because they are contained fully within a roof tile. */
        identifyInteriorWalls(): void;

        /**
         * Given a point and the coordinates of a wall, determine which endpoint is closer to the point
         * @param point The origin point of the new Wall placement
         * @param wall  The existing Wall object being chained to
         * @return The [x,y] coordinates of the starting endpoint
         */
        static getClosestEndpoint(point: Point, wall: Wall<WallDocument<Scene>>): PointArray;

        /**
         * Given an array of Wall instances, identify the unique endpoints across all walls.
         * @param walls  An collection of Wall objects
         * @param [options={}] Additional options which modify the set of endpoints identified
         * @param [options.bounds]        An optional bounding rectangle within which the endpoint must lie.
         * @param [options.type=movement] The type of polygon being computed: "movement", "sight", or "sound"
         * @return An array of endpoints
         */
        static getUniqueEndpoints(
            walls: Iterable<Wall<WallDocument<Scene>>>,
            { bounds, type }?: { bounds?: PIXI.Rectangle; type?: WallType },
        ): PointArray[];

        /**
         * Highlight the endpoints of Wall segments which are currently group-controlled on the Walls layer
         */
        highlightControlledSegments(): void;

        override releaseAll(options: Record<string, unknown>): number;

        pasteObjects(
            position: { x: number; y: number },
            { hidden }?: { hidden?: boolean },
        ): Promise<TObject["document"][]>;

        /**
         * Pan the canvas view when the cursor position gets close to the edge of the frame
         * @param event The originating mouse movement event
         * @param x     The x-coordinate
         * @param y     The y-coordinate
         */
        protected _panCanvasEdge(event: MouseEvent, x: number, y: number): void;

        /**
         * Get the endpoint coordinates for a wall placement, snapping to grid at a specified precision
         * Require snap-to-grid until a redesign of the wall chaining system can occur.
         * @param point The initial candidate point
         * @param [snap=true] Whether to snap to grid
         * @return The endpoint coordinates [x,y]
         */
        protected _getWallEndpointCoordinates(point: [number, number], { snap }?: { snap?: boolean }): [number, number];

        /**
         * The Scene Controls tools provide several different types of prototypical Walls to choose from
         * This method helps to translate each tool into a default wall data configuration for that type
         * @param tool The active canvas tool
         */
        protected _getWallDataFromActiveTool(tool: string): Partial<foundry.documents.WallSource>;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void;

        protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

        protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

        protected override _onDragLeftCancel(event: PIXI.FederatedEvent): void;

        protected override _onClickRight(event: PIXI.FederatedEvent): void;

        /* -------------------------------------------- */
        /*  Source Polygon Computation                  */
        /* -------------------------------------------- */

        /**
         * Compute source polygons of a requested type for a given origin position and maximum radius.
         * This method returns two polygons, one which is unrestricted by the provided radius, and one that is constrained
         * by the maximum radius.
         *
         * @param origin An point with coordinates x and y representing the origin of the test
         * @param radius A distance in canvas pixels which reflects the visible range
         * @param [options={}] Additional options which modify the sight computation
         * @param [options.type=sight] The type of polygon being computed: "movement", "sight", or "sound"
         * @param [options.angle=360]  An optional limited angle of emission with which to restrict polygons
         * @param [options.density=6]  The desired radial density of emission for rays, in degrees
         * @param [options.rotation=0] The current angle of rotation, used when the angle is limited
         * @param [options.unrestricted=false]  Compute sight that is fully unrestricted by walls
         *
         * @returns The computed rays and polygons
         */
        computePolygon(
            origin: Point,
            radius: number,
            {
                type,
                angle,
                density,
                rotation,
                unrestricted,
            }: {
                type?: WallType;
                angle?: number;
                density?: number;
                rotation?: number;
                unrestricted?: boolean;
            },
        ): { rays: Ray; los: PIXI.Polygon; fov: PIXI.Polygon };

        /**
         * Get the set of wall collisions for a given Ray
         * @param ray The Ray being tested
         * @param [options={}] Options which customize how collision is tested
         * @param [options.type=movement] Which collision type to check: movement, sight, sound
         * @param [options.mode=any]      Which type of collisions are returned: any, closest, all
         * @param [options._performance]  Internal performance tracking
         *
         * @return An array of collisions, if mode is "all"
         *         The closest collision, if mode is "closest"
         *         Whether any collision occurred if mode is "any"
         */
        getRayCollisions(
            ray: Ray,
            { type, mode, _performance }?: { type?: WallType; mode?: WallMode; _performance?: unknown },
        ): Record<string, unknown> | Record<string, unknown> | boolean;

        /* -------------------------------------------- */
        /*  Helper Methods                              */
        /* -------------------------------------------- */

        /**
         * A helper method responsible for casting rays at wall endpoints.
         * Rays are restricted by limiting angles.
         *
         * @param x          The origin x-coordinate
         * @param y          The origin y-coordinate
         * @param distance   The ray distance
         * @param density    The desired radial density
         * @param endpoints  An array of endpoints to target
         * @param limitAngle Whether the rays should be cast subject to a limited angle of emission
         * @param aMin               The minimum bounding angle
         * @param aMax               The maximum bounding angle
         *
         * @returns An array of Ray objects
         */
        static castRays(
            x: number,
            y: number,
            distance: number,
            {
                density,
                endpoints,
                limitAngle,
                aMin,
                aMax,
            }?: { density?: number; endpoints?: PointArray[]; limitAngle?: boolean; aMin?: number; aMax?: boolean },
        ): Ray[];

        /**
         * Test a single Ray against a single Wall
         * @param ray  The Ray being tested
         * @param wall The Wall against which to test
         * @return A RayIntersection if a collision occurred, or null
         */
        static testWall(ray: Ray, wall: Wall<WallDocument<Scene>>): RayIntersection | null;

        /**
         * Identify the closest collision point from an array of collisions
         * @param collisions  An array of intersection points
         * @return The closest blocking intersection or null if no collision occurred
         */
        static getClosestCollision(collisions: RayIntersection[]): RayIntersection | null;

        /**
         * Normalize an angle to ensure it is baselined to be the smallest angle that is greater than a minimum.
         * @param aMin  The lower-bound minimum angle
         * @param angle The angle to adjust
         * @return The adjusted angle which is greater than or equal to aMin.
         */
        protected static _normalizeAngle(aMin: number, angle: number): number;

        /**
         * Map source types to wall collision types
         * @param type The source polygon type
         * @returns The wall collision attribute
         */
        protected static _mapWallCollisionType(type: WallType): string;
    }

    interface WallsLayerOptions extends PlaceablesLayerOptions {
        name: "walls";
        controllableObjects: boolean;
        objectClass: typeof Wall;
        quadtree: boolean;
        sheetClass: typeof WallConfig;
        sortActiveTop: boolean;
        zIndex: number;
    }

    type WallType = "movement" | "sight" | "sound";

    type WallMode = "all" | "any" | "closest";
}
