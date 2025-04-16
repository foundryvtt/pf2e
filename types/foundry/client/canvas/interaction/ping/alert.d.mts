import PulsePing from "./pulse.d.mts";

/**
 * @import {PulsePingOptions} from "../_types.mjs"
 * @import {Point} from "@common/_types.mjs";
 */

/**
 * A type of ping that produces a pulse warning sign animation.
 */
export default class AlertPing extends PulsePing {
    /**
     * @param {Point} origin                The canvas coordinates of the origin of the ping.
     * @param {PulsePingOptions} [options]  Additional options to configure the ping animation.
     */
    constructor(origin, { color = "#ff0000", ...options } = {}) {
        super(origin, { color, ...options });
        this.scale.set(2, 2);
    }

    /* -------------------------------------------- */

    /** @override */
    _drawShape(g, color, alpha, size) {
        // Draw a chamfered triangle.
        g.lineStyle({
            color,
            alpha,
            width: 3 * canvas.dimensions.uiScale,
            cap: PIXI.LINE_CAP.ROUND,
            join: PIXI.LINE_JOIN.BEVEL,
        });
        const half = size / 2;
        const chamfer = size / 10;
        const chamfer2 = chamfer / 2;
        const x = -half;
        const y = -(size / 3);
        g.moveTo(x + chamfer, y)
            .lineTo(x + size - chamfer, y)
            .lineTo(x + size, y + chamfer)
            .lineTo(x + half + chamfer2, y + size - chamfer)
            .lineTo(x + half - chamfer2, y + size - chamfer)
            .lineTo(x, y + chamfer)
            .lineTo(x + chamfer, y);
    }
}
