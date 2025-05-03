import { Point } from "@common/_types.mjs";
import { PulsePingOptions } from "../_types.mjs";
import PulsePing from "./pulse.mjs";

/**
 * A type of ping that produces an arrow pointing in a given direction.
 */
export default class ArrowPing extends PulsePing {
    /**
     * @param origin The canvas coordinates of the origin of the ping. This becomes the arrow's tip.
     * @param options Additional options to configure the ping animation.
     */
    constructor(origin: Point, options?: PulsePingOptions & { rotation?: number });

    protected override _drawShape(g: PIXI.Graphics, color: number, alpha: number, size: number): void;
}
