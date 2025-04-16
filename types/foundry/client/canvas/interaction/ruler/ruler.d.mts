import { RulerWaypoint } from "@client/_types.mjs";
import User from "@client/documents/user.mjs";
import BaseRuler from "./base-ruler.mjs";

/**
 * The default implementation of the Ruler.
 */
export default class Ruler extends BaseRuler {
    constructor(user: User);

    /**
     * A handlebars template used to render each waypoint label.
     */
    static WAYPOINT_TEMPLATE: string;

    /**
     * Configure the properties of the outline.
     * Called in {@link draw}.
     * @returns The thickness in pixels and the color
     */
    protected _configureOutline(): { thickness: number; color: PIXI.ColorSource };

    override draw(): Promise<void>;

    override destroy(): void;

    protected override _refresh(): void;

    /**
     * Prepare an array of data structures used for ruler waypoint labels.
     */
    protected _prepareWaypointData(waypoints: RulerWaypoint[]): RulerWaypointData;

    /**
     * Get the style of the waypoint at the given waypoint.
     * @param {RulerWaypoint} waypoint The waypoint
     * @returns The radius, color, and alpha of the waypoint
     */
    protected _getWaypointStyle(waypoint: RulerWaypoint): { radius: number; color?: PIXI.ColorSource; alpha?: number };

    /**
     * Get the style of the segment from the previous to the given waypoint.
     * @param waypoint The waypoint
     * @returns The line width, color, and alpha of the segment
     */
    protected _getSegmentStyle(waypoint: RulerWaypoint): { width: number; color?: PIXI.ColorSource; alpha?: number };
}

interface RulerWaypointData {
    action: { icon: string };
    cssClass: string;
    secret: boolean;
    units: string;
    uiScale: number;
    waypoint: RulerWaypoint;
}
