import { LightSourceAnimationConfig } from "@client/config.mjs";
import { LightingLevel } from "@common/constants.mjs";
import { AmbientLight, Token } from "../placeables/_module.mjs";
import AbstractBaseShader from "../rendering/shaders/base-shader.mjs";
import RenderedEffectSource, {
    RenderedEffectLayerConfig,
    RenderedEffectSourceData,
} from "./rendered-effect-source.mjs";

export interface LightSourceData extends RenderedEffectSourceData {
    /** An opacity for the emitted light, if any */
    alpha: number;
    /** An animation configuration for the source */
    animation: object;
    /** The allowed radius of bright vision or illumination */
    bright: number;
    /** The coloration technique applied in the shader */
    coloration: number;
    /** The amount of contrast this light applies to the background texture */
    contrast: number;
    /** The allowed radius of dim vision or illumination */
    dim: number;
    /** Strength of the attenuation between bright, dim, and dark */
    attenuation: number;
    /** The luminosity applied in the shader */
    luminosity: number;
    /** The amount of color saturation this light applies to the background texture */
    saturation: number;
    /** The depth of shadows this light applies to the background texture */
    shadows: number;
    /** Whether or not this source provides a source of vision */
    vision: boolean;
    /** Strength of this source to beat or not negative/positive sources */
    priority: number;
}

/**
 * A specialized subclass of the PointSource abstraction which is used to control the rendering of light sources.
 * @param [options.object] The light-emitting object that generates this light source
 */
export default abstract class BaseLightSource<
    TObject extends AmbientLight | Token | null,
> extends RenderedEffectSource<TObject> {
    static override sourceType: string;

    static override _initializeShaderKeys: string[];

    static override _refreshUniformsKeys: string[];

    /**
     * The corresponding lighting levels for dim light.
     */
    static _dimLightingLevel: LightingLevel;

    /**
     * The corresponding lighting levels for bright light.
     */
    static _brightLightingLevel: LightingLevel;

    /**
     * The corresponding animation config.
     */
    static get ANIMATIONS(): LightSourceAnimationConfig;

    static override get _layers(): Record<"background" | "coloration" | "illumination", RenderedEffectLayerConfig>;

    static override defaultData: LightSourceData;

    /* -------------------------------------------- */
    /*  Light Source Attributes                     */
    /* -------------------------------------------- */

    /**
     * A ratio of dim:bright as part of the source radius
     */
    ratio: number;

    /* -------------------------------------------- */
    /*  Light Source Initialization                 */
    /* -------------------------------------------- */

    protected override _initialize(data: Partial<LightSourceData>): void;

    /* -------------------------------------------- */
    /*  Shader Management                           */
    /* -------------------------------------------- */

    protected override _updateColorationUniforms(): void;

    protected override _updateIlluminationUniforms(): void;

    protected override _updateBackgroundUniforms(): void;

    protected override _updateCommonUniforms(shader: AbstractBaseShader): void;

    /* -------------------------------------------- */
    /*  Animation Functions                         */
    /* -------------------------------------------- */

    /**
     * An animation with flickering ratio and light intensity.
     * @param dt Delta time
     * @param options Additional options which modify the flame animation
     * @param options.speed The animation speed, from 0 to 10
     * @param options.intensity The animation intensity, from 1 to 10
     * @param options.reverse Reverse the animation direction
     */
    animateTorch(dt: number, options?: { speed?: number; intensity?: number; reverse?: boolean }): void;

    /**
     * An animation with flickering ratio and light intensity
     * @param dt Delta time
     * @param options Additional options which modify the flame animation
     * @param options.speed The animation speed, from 0 to 10
     * @param options.intensity The animation intensity, from 1 to 10
     * @param options.amplification Noise amplification (>1) or dampening (<1)
     * @param options.reverse Reverse the animation direction
     */
    animateFlickering(
        dt: number,
        options?: { speed?: number; intensity?: number; amplification?: number; reverse?: boolean },
    ): void;

    /**
     * A basic "pulse" animation which expands and contracts.
     * @param dt Delta time
     * @param options Additional options which modify the pulse animation
     * @param options.speed The animation speed, from 0 to 10
     * @param options.intensity The animation intensity, from 1 to 10
     * @param options.reverse Reverse the animation direction
     */
    animatePulse(dt: number, options?: { speed?: number; intensity?: number; reverse?: boolean }): void;

    /**
     * A sound-reactive animation that uses bass/mid/treble blending to control certain shader uniforms.
     * "speed" is interpreted as how quickly we adapt to changes in audio. No time-based pulsing is used by default,
     * but we incorporate dt into smoothing so that behavior is consistent across varying frame rates.
     *
     * @param dt The delta time since the last frame, in milliseconds.
     * @param options Additional options for customizing the audio reaction.
     * @param options.speed A smoothing factor in [0..10], effectively updates/second.
     * @param options.intensity A blend factor in [0..10] that transitions from bass (near 0) to treble (near 10). Mid
     *                          frequencies dominate around intensity=5.
     * @param options.reverse Whether to invert the final amplitude as 1 - amplitude.
     */
    animateSoundPulse(dt: number, options?: { speed?: number; intensity?: number; reverse?: boolean }): void;
}

export {};
