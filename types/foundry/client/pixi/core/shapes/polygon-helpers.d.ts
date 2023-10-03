export {};

declare global {
    /** An internal data structure for polygon vertices */
    class PolygonVertex {
        x: number;
        y: number;
        key: number;
        _distance: number;
        _d2: unknown;
        protected _index: number;

        /**
         * The set of edges which connect to this vertex.
         * This set is initially empty and populated later after vertices are de-duplicated.
         */
        edges: Set<PolygonEdge>;

        /** The subset of edges which continue clockwise from this vertex. */
        cwEdges: Set<PolygonEdge>;

        /** The subset of edges which continue counter-clockwise from this vertex. */
        ccwEdges: Set<PolygonEdge>;

        /** The set of vertices collinear to this vertex */
        collinearVertices: Set<PolygonVertex>;

        /** The maximum restriction type of this vertex */
        type: WallSenseType | null;

        constructor(x: number, y: number, { distance, index }?: { distance?: number; index?: number });

        /** Is this vertex an endpoint of one or more edges? */
        isEndpoint: boolean;

        /** Does this vertex have a single counterclockwise limiting edge? */
        isLimitingCCW: boolean;

        /** Does this vertex have a single clockwise limiting edge? */
        isLimitingCW: boolean;

        /** Does this vertex have non-limited edges or 2+ limited edges counterclockwise? */
        isBlockingCCW: boolean;

        /** Does this vertex have non-limited edges or 2+ limited edges clockwise? */
        isBlockingCW: boolean;

        /**
         * Associate an edge with this vertex.
         * @param edge The edge being attached
         * @param orientation The orientation of the edge with respect to the origin
         */
        attachEdge(edge: PolygonEdge, orientation?: number): void;

        /** Is this vertex limited in type? */
        get isLimited(): boolean;

        /** Is this vertex terminal (at the maximum radius) */
        get isTerminal(): boolean;

        /**
         * Is this vertex the same point as some other vertex?
         * @param other Some other vertex
         * @returns Are they the same point?
         */
        equals(other: PolygonVertex): boolean;

        /**
         * Construct a PolygonVertex instance from some other Point structure.
         * @param point     The point
         * @param [options] Additional options that apply to this vertex
         * @returns The constructed vertex
         */
        static fromPoint(point: Point, options?: object): PolygonVertex;
    }

    /** An internal data structure for polygon edges */
    class PolygonEdge {
        A: PolygonVertex;

        B: PolygonVertex;

        type: WallSenseType | undefined;

        wall: Wall<WallDocument<Scene | null>> | undefined;

        constructor(a: PolygonVertex, b: PolygonVertex, type?: WallSenseType, wall?: Wall<WallDocument<Scene | null>>);

        /** An internal flag used to record whether an Edge represents a canvas boundary. */
        protected _isBoundary: boolean;

        /** Is this edge limited in type? */
        get isLimited(): boolean;

        /**
         * Construct a PolygonEdge instance from a Wall placeable object.
         * @param wall The Wall from which to construct an edge
         * @param type The type of polygon being constructed
         */
        static fromWall(wall: Wall<WallDocument<Scene | null>>, type: string): PolygonEdge;
    }
}
