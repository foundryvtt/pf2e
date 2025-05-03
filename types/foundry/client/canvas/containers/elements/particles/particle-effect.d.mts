import { Emitter, EmitterConfigV3 } from "@pixi/particle-emitter";
import FullCanvasObjectMixin from "../../advanced/full-canvas-mixin.mts";

/**
 * An interface for defining particle-based weather effects
 * @mixes FullCanvasObjectMixin
 */
export default class ParticleEffect extends FullCanvasObjectMixin(PIXI.Container) {
    /** The array of emitters which are active for this particle effect */
    emitters: Emitter[];

    /**
     * @param [options] Options passed to the getParticleEmitters method which can be used to customize
     *                  values of the emitter configuration.
     */
    constructor(options?: EmitterConfigV3);

    /**
     * Create an emitter instance which automatically updates using the shared PIXI.Ticker
     * @param config The emitter configuration
     * @returns The created Emitter instance
     */
    createEmitter(config: EmitterConfigV3): Emitter;

    /**
     * Get the particle emitters which should be active for this particle effect.
     * This base class creates a single emitter using the explicitly provided configuration.
     * Subclasses can override this method for more advanced configurations.
     * @param [options={}] Options provided to the ParticleEffect constructor which can be used to customize
     *                     configuration values for created emitters.
     */
    getParticleEmitters(options?: EmitterConfigV3): Emitter[];

    override destroy(options?: PIXI.IDestroyOptions | boolean): void;

    /** Begin animation for the configured emitters. */
    play(): void;

    /** Stop animation for the configured emitters. */
    stop(): void;
}
