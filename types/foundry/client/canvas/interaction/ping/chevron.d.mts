import CanvasAnimation from "../../animation/canvas-animation.mjs";
import TextureLoader from "../../loader.mjs";
import Ping from "./ping.d.mts";

/**
 * @import {PingOptions} from "../_types.mjs"
 * @import {Point} from "@common/_types.mjs";
 */

/**
 * A type of ping that points to a specific location.
 */
export default class ChevronPing extends Ping {
    /**
     * @param {Point} origin           The canvas coordinates of the origin of the ping.
     * @param {PingOptions} [options]  Additional options to configure the ping animation.
     */
    constructor(origin, options = {}) {
        super(origin, options);
        this.#r = (this.options.size / 2) * 0.75;

        // The inner ring is 3/4s the size of the outer.
        this.#rInner = this.#r * 0.75;

        // The animation is split into three stages. First, the chevron fades in and moves downwards, then the rings fade
        // in, then everything fades out as the chevron moves back up.
        // Store the 1/4 time slice.
        this.#t14 = this.options.duration * 0.25;

        // Store the 1/2 time slice.
        this.#t12 = this.options.duration * 0.5;

        // Store the 3/4s time slice.
        this.#t34 = this.#t14 * 3;
    }

    /**
     * The path to the chevron texture.
     * @type {string}
     */
    static CHEVRON_PATH = "icons/pings/chevron.webp";

    /* -------------------------------------------- */

    /** @type {number} */
    #r;

    /** @type {number} */
    #rInner;

    /** @type {number} */
    #t14;

    /** @type {number} */
    #t12;

    /** @type {number} */
    #t34;

    /** @type {number} */
    #y;

    /** @type {number} */
    #h2;

    /* -------------------------------------------- */

    /**
     * The sprite.
     * @type {PIXI.Sprite}
     */
    #chevron;

    /* -------------------------------------------- */

    /**
     * The inner ring.
     * @type {PIXI.Graphics}
     */
    #inner;

    /* -------------------------------------------- */

    /**
     * The outer ring.
     * @type {PIXI.Graphics}
     */
    #outer;

    /* -------------------------------------------- */

    /** @inheritDoc */
    async animate() {
        this.removeChildren().forEach((c) => c.destroy({ children: true }));
        this.addChild(...this.#createRings());
        this.#chevron = await this.#loadChevron();
        this.addChild(this.#chevron);
        return super.animate();
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _animateFrame(dt, animation) {
        const { time } = animation;
        if (time < this.#t14) {
            // Normalise t between 0 and 1.
            const t = time / this.#t14;
            // Apply easing function.
            const dy = CanvasAnimation.easeOutCircle(t);
            this.#chevron.y = this.#y + this.#h2 * dy;
            this.#chevron.alpha = time / this.#t14;
        } else if (time < this.#t34) {
            const t = time - this.#t14;
            const a = t / this.#t12;
            this.#drawRings(a);
        } else {
            const t = (time - this.#t34) / this.#t14;
            const a = 1 - t;
            const dy = CanvasAnimation.easeInCircle(t);
            this.#chevron.y = this.#y + (1 - dy) * this.#h2;
            this.#chevron.alpha = a;
            this.#drawRings(a);
        }
    }

    /* -------------------------------------------- */

    /**
     * Draw the outer and inner rings.
     * @param {number} a  The alpha.
     */
    #drawRings(a) {
        const s = canvas.dimensions.uiScale;
        this.#outer.clear();
        this.#inner.clear();
        this.#outer.lineStyle(6 * s, this._color, a).drawCircle(0, 0, this.#r);
        this.#inner.lineStyle(3 * s, this._color, a).arc(0, 0, this.#rInner, 0, Math.PI * 1.5);
    }

    /* -------------------------------------------- */

    /**
     * Load the chevron texture.
     * @returns {Promise<PIXI.Sprite>}
     */
    async #loadChevron() {
        const texture = await TextureLoader.loader.loadTexture(ChevronPing.CHEVRON_PATH);
        const chevron = PIXI.Sprite.from(texture);
        chevron.tint = this._color;

        const w = this.options.size;
        const h = (texture.height / texture.width) * w;
        chevron.width = w;
        chevron.height = h;

        // The chevron begins the animation slightly above the pinged point.
        this.#h2 = h / 2;
        chevron.x = -(w / 2);
        chevron.y = this.#y = -h - this.#h2;

        return chevron;
    }

    /* -------------------------------------------- */

    /**
     * Draw the two rings that are used as part of the ping animation.
     * @returns {PIXI.Graphics[]}
     */
    #createRings() {
        this.#outer = new PIXI.Graphics();
        this.#inner = new PIXI.Graphics();
        return [this.#outer, this.#inner];
    }
}
