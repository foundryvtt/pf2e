import { CanvasTransformMixin } from "./primary-canvas-object.mjs";

/**
 * A lightweight primary-canvas container designed for particle effects.
 * This container intentionally avoids any internal sorting or depth participation. Children render in insertion order.
 */
export default class PrimaryCanvasParticleContainer extends CanvasTransformMixin(PIXI.Container) {
    constructor(...args: unknown[]);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** The elevation of this container. */
    get elevation(): number;

    set elevation(value: number);

    /** A key which resolves ties amongst objects at the same elevation within the same layer. */
    get sort(): number;

    set sort(value: number);

    /** Particle containers do not render depth. */
    get shouldRenderDepth(): false;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override renderDepthData(renderer: PIXI.Renderer): void;
}
