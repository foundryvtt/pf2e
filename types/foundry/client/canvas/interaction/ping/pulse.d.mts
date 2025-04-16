import { CanvasAnimationData } from "@client/canvas/animation/_types.mjs";
import { Point } from "@common/_types.mjs";
import { PulsePingOptions } from "../_types.mjs";
import Ping from "./ping.mjs";

/**
 * A type of ping that produces a pulsing animation.
 */
export default class PulsePing extends Ping {
    /**
     * @param origin  The canvas coordinates of the origin of the ping.
     * @param options Additional options to configure the ping animation.
     */
    constructor(origin: Point, options?: PulsePingOptions);

    override animate(): Promise<boolean>;

    protected override _animateFrame(dt: number, animation: CanvasAnimationData): void;

    /**
     * Draw the shape for this ping.
     * @param g     The graphics object to draw to.
     * @param color The color of the shape.
     * @param alpha The alpha of the shape.
     * @param size  The size of the shape to draw.
     */
    protected _drawShape(g: PIXI.Graphics, color: number, alpha: number, size: number): void;
}
