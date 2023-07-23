export {};

declare global {
    interface QuadtreeObject<
        TPlaceableObject extends PlaceableObject = PlaceableObject,
        TQuadtree extends Quadtree<TPlaceableObject> = Quadtree<TPlaceableObject>
    > {
        r: Rectangle;
        t: TPlaceableObject;
        n: Set<TQuadtree>;
    }

    /**
     * A Quadtree implementation that supports collision detection for rectangles.
     *
     * @param {Rectangle} bounds       The outer bounds of the region
     * @param [options]                Additional options which configure the Quadtree
     * @param [options.maxObjects=20]  The maximum number of objects per node
     * @param [options.maxDepth=4]     The maximum number of levels within the root Quadtree
     * @param [options._depth=0]       The depth level of the sub-tree. For internal use
     * @param [options._root]          The root of the quadtree. For internal use
     */
    class Quadtree<TPlaceableObject extends PlaceableObject> {
        /** The bounding rectangle of the region */
        bounds: Rectangle;

        /** The maximum number of objects allowed within this node before it must split */
        maxObjects: number;

        /** The maximum number of levels that the base quadtree is allowed */
        maxDepth: number;

        /** The depth of this node within the root Quadtree */
        depth: number;

        /** The objects contained at this level of the tree */
        objects: QuadtreeObject<TPlaceableObject, this>[];

        /** Children of this node */
        nodes: this[];

        /** The root Quadtree */
        root: this;

        constructor(
            bounds: Rectangle,
            options?: { maxObjects?: number; maxDepth?: number; _depth?: number; _root?: Quadtree<TPlaceableObject> }
        );

        /**
         * A constant that enumerates the index order of the quadtree nodes from top-left to bottom-right.
         * @enum {number}
         */
        static INDICES: { tl: number; tr: number; bl: number; br: number };

        /**
         * Return an array of all the objects in the Quadtree (recursive)
         */
        get all(): QuadtreeObject<TPlaceableObject, this>[];

        /* -------------------------------------------- */
        /*  Tree Management                             */
        /* -------------------------------------------- */

        /**
         * Split this node into 4 sub-nodes.
         * @returns The split Quadtree
         */
        split(): this;

        /* -------------------------------------------- */
        /*  Object Management                           */
        /* -------------------------------------------- */

        /**
         * Clear the quadtree of all existing contents
         * @returns The cleared Quadtree
         */
        clear(): this;

        /**
         * Add a rectangle object to the tree
         * @param  obj  The object being inserted
         * @returns     The Quadtree nodes the object was added to.
         */
        insert(obj: QuadtreeObject<TPlaceableObject, this>): this[];

        /**
         * Remove an object from the quadtree
         * @param target     The quadtree target being removed
         * @returns          The Quadtree for method chaining
         */
        remove(target: TPlaceableObject): this;

        /**
         * Remove an existing object from the quadtree and re-insert it with a new position
         * @param obj  The object being inserted
         * @returns    The Quadtree nodes the object was added to
         */
        update(obj: QuadtreeObject<TPlaceableObject, this>): this[];

        /* -------------------------------------------- */
        /*  Target Identification                       */
        /* -------------------------------------------- */

        /**
         * Get all the objects which could collide with the provided rectangle
         * @param rect    The normalized target rectangle
         * @param [options]                    Options affecting the collision test.
         * @param [options.collisionTest]    Function to further refine objects to return
         *   after a potential collision is found. Parameters are the object and rect, and the
         *   function should return true if the object should be added to the result set.
         * @param [options._s]                    The existing result set, for internal use.
         * @returns   The objects in the Quadtree which represent potential collisions
         */
        getObjects(
            rect: Rectangle,
            options?: {
                collisionTest?: (obj: QuadtreeObject, rect: Rectangle) => boolean;
                _s: Set<TPlaceableObject>;
            }
        ): Set<TPlaceableObject>;

        /**
         * Obtain the leaf nodes to which a target rectangle belongs.
         * This traverses the quadtree recursively obtaining the final nodes which have no children.
         * @param rect  The target rectangle.
         * @returns     The Quadtree nodes to which the target rectangle belongs
         */
        getLeafNodes(rect: Rectangle): this[];

        /**
         * Obtain the child nodes within the current node which a rectangle belongs to.
         * Note that this function is not recursive, it only returns nodes at the current or child level.
         * @param rect  The target rectangle.
         * @returns     The Quadtree nodes to which the target rectangle belongs
         */
        getChildNodes(rect: Rectangle): this[];

        /** Identify all nodes which are adjacent to this one within the parent Quadtree. */
        getAdjacentNodes(): this[];

        /**
         * Visualize the nodes and objects in the quadtree
         * @param [options]
         * @param [options.objects]    Visualize the rectangular bounds of objects in the Quadtree. Default is false.
         */
        private visualize(options?: { object?: boolean }): void;
    }

    /**
     * A subclass of Quadtree specifically intended for classifying the location of objects on the game canvas.
     */
    class CanvasQuadtree<TPlaceableObject extends PlaceableObject> extends Quadtree<TPlaceableObject> {}
}
