import { SmoothGraphics, SmoothGraphicsGeometry } from "@pixi/graphics-smooth";
import { IDestroyOptions } from "pixi.js";

/** A special Graphics class which handles Grid layer highlighting */
export default class GridHighlight extends SmoothGraphics {
    /** Track the Grid Highlight name */
    name: string;

    /** Track distinct positions which have already been highlighted */
    positions: Set<string>;

    constructor(name: string, geometry?: SmoothGraphicsGeometry);

    /**
     * Record a position that is highlighted and return whether or not it should be rendered
     * @param x  The x-coordinate to highlight
     * @param y  The y-coordinate to highlight
     * @return Whether or not to draw the highlight for this location
     */
    highlight(x: number, y: number): boolean;

    override clear(): this;

    override destroy(options?: IDestroyOptions | boolean): this;
}
