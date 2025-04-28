import { CanvasTransformMixin } from "./primary-canvas-object.mjs";

/**
 * A configurable particle effect meant to be used in the PrimaryCanvasGroup.
 * You must provide a full configuration object.
 */
export default class PrimaryParticleEffect extends CanvasTransformMixin(PIXI.Container) {
    constructor(config?: object);

    /**
     * A key which resolves ties amongst objects at the same elevation within the same layer.
     */
    get sort(): number;

    set sort(value);

    /**
     * The elevation of this container.
     */
    get elevation(): number;

    set elevation(value);
    /**
     * Always false for a Primary Particle Effect.
     */
    get shouldRenderDepth(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override destroy(options: PIXI.IDestroyOptions | boolean): void;

    /**
     * Initialize the emitter with optional configuration.
     * @param config Optional config object.
     * @param play Should we play immediately? False by default.
     */
    initialize(config?: object, play?: boolean): void;

    /**
     * Begin animation for the configured emitter.
     */
    play(): void;

    /**
     * Stop animation for the configured emitter.
     */
    stop(): void;
}
