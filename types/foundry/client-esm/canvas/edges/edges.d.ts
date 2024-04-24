import type { Edge } from "./edge.d.ts";

export class CanvasEdges extends Map {
    /** Edge instances which represent the outer boundaries of the game canvas. */
    #outerBounds: Edge[];

    /** Edge instances which represent the inner boundaries of the scene rectangle. */
    #innerBounds: Edge[];

    /**
     * Initialize all active edges for the Scene. This workflow occurs once only when the Canvas is first initialized.
     * Edges are created from the following sources:
     * 1. Wall documents
     * 2. Canvas boundaries (inner and outer bounds)
     * 3. Darkness sources
     * 4. Programmatically defined in the "initializeEdges" hook
     */
    initialize(): void;

    /** Incrementally refresh Edges by computing intersections between all registered edges. */
    refresh(): void;
}
