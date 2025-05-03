import { Emitter, EmitterConfigV3 } from "@pixi/particle-emitter";
import ParticleEffect from "./particle-effect.mjs";

/**
 * A full-screen weather effect which renders gently falling autumn leaves.
 */
export default class AutumnLeavesWeatherEffect extends ParticleEffect {
    static label: "WEATHER.AutumnLeaves";

    /** Configuration for the particle emitter for falling leaves */
    static LEAF_CONFIG: EmitterConfigV3;

    override getParticleEmitters(): Emitter[];
}
