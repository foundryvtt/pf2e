import { CanvasAnimationData } from "@client/canvas/animation/_types.mjs";
import { Point } from "@common/_types.mjs";
import Color from "@common/utils/color.mjs";
import { PingOptions } from "../_types.mjs";

/**
 * A class to manage a user ping on the canvas.
 */
export default abstract class Ping extends PIXI.Container {
    /**
     * @param origin  The canvas coordinates of the origin of the ping.
     * @param options Additional options to configure the ping animation.
     */
    constructor(origin: Point, options?: PingOptions);

    /**
     * The color of the ping.
     */
    protected _color: Color;

    override destroy(options?: PIXI.IDestroyOptions): void;

    /**
     * Start the ping animation.
     * @returns Returns true if the animation ran to completion, false otherwise.
     */
    animate(): Promise<boolean>;

    /**
     * On each tick, advance the animation.
     * @param dt The number of ms that elapsed since the previous frame.
     * @param animation The animation state.
     */
    protected abstract _animateFrame(dt: number, animation: CanvasAnimationData): void;
}
