import { Point } from "@common/_types.mjs";
import { PulsePingOptions } from "../_types.mjs";
import PulsePing from "./pulse.mjs";

/**
 * A type of ping that produces a pulse warning sign animation.
 */
export default class AlertPing extends PulsePing {
    /**
     * @param origin The canvas coordinates of the origin of the ping.
     * @param options Additional options to configure the ping animation.
     */
    constructor(origin: Point, options?: PulsePingOptions);

    protected override _drawShape(g: PIXI.Graphics, color: number, alpha: number, size: number): void;
}
