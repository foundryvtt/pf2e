import Edge from "@client/canvas/geometry/edges/edge.mjs";
import { EdgeRestrictionType, EdgeSenseType } from "@common/constants.mjs";
import Wall from "../canvas/placeables/wall.mjs";
import { BaseWall, WallCategory } from "./_module.mjs";
import { CanvasDocument, CanvasDocumentStatic } from "./abstract/canvas-document.mjs";
import Scene from "./scene.mjs";

interface CanvasBaseWallStatic extends Omit<typeof BaseWall, "new">, CanvasDocumentStatic {}

declare const CanvasBaseWall: {
    new <TParent extends Scene | null>(...args: any): BaseWall<TParent> & CanvasDocument<TParent>;
} & CanvasBaseWallStatic;

interface CanvasBaseWall<TParent extends Scene | null> extends InstanceType<typeof CanvasBaseWall<TParent>> {}

export default class WallDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseWall<TParent> {
    /**
     * The Edge instance which represents this Wall.
     * The Edge is re-created when data for the Wall changes.
     */
    get edge(): Edge | null;

    /** The darkness edge sense type, which is the same value as {@link WallDocument#light}. */
    get darkness(): EdgeSenseType;

    /** Whether this Document represents a door. */
    get isDoor(): boolean;

    /** Whether this Document represents an open door. */
    get isOpen(): boolean;

    /** Broadly classify a wall into one of several categories, based on its properties. */
    getWallCategory(): WallCategory;

    /**
     * Initialize the edge which represents this Wall document.
     * @param options Options which modify how the edge is initialized
     * @param [options.deleted] Delete the edge of this Wall document?
     * @param [options.priorLevels] The IDs of prior Levels, if the levels this Wall document is included in has changed
     * @param [options.changedTypes] The restriction types that either now affected or no longer affected by this Wall document
     */
    initializeEdge(options?: {
        deleted?: boolean;
        priorLevels?: string[] | Set<string>;
        changedTypes?: Set<EdgeRestrictionType>;
    }): void;
}

export default interface WallDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseWall<TParent> {
    get object(): Wall<this> | null;
}

export {};
