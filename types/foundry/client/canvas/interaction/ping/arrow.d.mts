import PulsePing from "./pulse.d.mts";

/**
 * @import {PulsePingOptions} from "../_types.mjs"
 * @import {Point} from "@common/_types.mjs";
 */

/**
 * A type of ping that produces an arrow pointing in a given direction.
 */
export default class ArrowPing extends PulsePing {
    /**
     * @param {Point} origin    The canvas coordinates of the origin of the ping. This becomes the arrow's tip.
     * @param {PulsePingOptions & {rotation?: number}} [options]  Additional options to configure the ping animation.
     */
    constructor(origin, { rotation = 0, ...options } = {}) {
        super(origin, options);
        this.rotation = Math.normalizeRadians(rotation + Math.PI * 1.5);
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _drawShape(g, color, alpha, size) {
        g.lineStyle({
            color,
            alpha,
            width: 6 * canvas.dimensions.uiScale,
            cap: PIXI.LINE_CAP.ROUND,
            join: PIXI.LINE_JOIN.BEVEL,
        });
        const half = size / 2;
        const x = -half;
        const y = -size;
        g.moveTo(x, y).lineTo(0, 0).lineTo(half, y).lineTo(0, -half).lineTo(x, y);
    }
}
