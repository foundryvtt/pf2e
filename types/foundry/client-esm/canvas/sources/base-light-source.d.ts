import type RenderedEffectSource from "./rendered-effect-source.d.ts";
import type { RenderedEffectSourceData } from "./rendered-effect-source.d.ts";

/**
 * A specialized subclass of the PointSource abstraction which is used to control the rendering of light sources.
 * @param [options.object] The light-emitting object that generates this light source
 */
export default class BaseLightSource<
    TObject extends AmbientLight | Token | null,
> extends RenderedEffectSource<TObject> {
    static sourceType: string;

    protected static override _initializeShaderKeys: string[];

    protected static override _refreshUniformsKeys: string[];

    /** The corresponding lighting levels for dim light. */
    protected static _dimLightingLevel: number;

    /** The corresponding lighting levels for bright light. */
    protected static _brightLightingLevel: number;

    /* -------------------------------------------- */
    /*  Light Source Attributes                     */
    /* -------------------------------------------- */

    /** The object of data which configures how the source is rendered */
    override data: LightSourceData;

    /** The ratio of dim:bright as part of the source radius */
    ratio: number;

    /* -------------------------------------------- */
    /*  Light Source Initialization                 */
    /* -------------------------------------------- */

    /**
     * Initialize the source with provided object data.
     * @param data Initial data provided to the point source
     * @return A reference to the initialized source
     */
    protected override _initialize(data?: Partial<LightSourceData>): void;

    /* -------------------------------------------- */
    /*  Shader Management                           */
    /* -------------------------------------------- */

    protected override _updateColorationUniforms(): void;

    protected override _updateIlluminationUniforms(): void;

    protected override _updateBackgroundUniforms(): void;

    protected _updateCommonUniforms(shader: PIXI.Shader): void;

    /* -------------------------------------------- */
    /*  Animation Functions                         */
    /* -------------------------------------------- */
    /**
     * An animation with flickering ratio and light intensity.
     * @param dt           Delta time
     * @param [options={}] Additional options which modify the flame animation
     * @param [options.speed=5]       The animation speed, from 1 to 10
     * @param [options.intensity=5]   The animation intensity, from 1 to 10
     * @param [options.reverse=false] Reverse the animation direction
     */
    animateTorch(dt: number, options?: { speed?: number; intensity?: number; reverse?: boolean }): void;

    /**
     * An animation with flickering ratio and light intensity
     * @param dt           Delta time
     * @param [options={}] Additional options which modify the flame animation
     * @param [options.speed=5]         The animation speed, from 1 to 10
     * @param [options.intensity=5]     The animation intensity, from 1 to 10
     * @param [options.amplification=1] Noise amplification (>1) or dampening (<1)
     * @param [options.reverse=false]   Reverse the animation direction
     */
    animateFlickering(
        dt: number,
        options?: { speed?: number; intensity?: number; amplification?: boolean; reverse?: boolean },
    ): void;

    /**
     * A basic "pulse" animation which expands and contracts.
     * @param dt        Delta time
     * @param speed     The animation speed, from 1 to 10
     * @param intensity The animation intensity, from 1 to 10
     * @param reverse   Is the animation reversed?
     */
    animatePulse(dt: number, options?: { speed?: number; intensity?: number; reverse?: number }): void;
}

declare global {
    interface LightSourceData extends RenderedEffectSourceData {
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

    interface LightSourceMeshes {
        background: PIXI.Mesh | null;
        light: PIXI.Mesh | null;
        color: PIXI.Mesh | null;
    }
}

interface LightAnimationConfiguration {
    label: string;
    animation: (...args: unknown[]) => void;
    /* A custom illumination shader used by this animation */
    illuminationShader: PIXI.Shader;
    /* A custom coloration shader used by this animation */
    colorationShader: PIXI.Shader;
    /* A custom background shader used by this animation */
    backgroundShader: PIXI.Shader;
    /** The animation seed */
    seed?: number;
    /** The animation time */
    time?: number;
}

interface ARParameters {
    phi?: number;
    center?: number;
    sigma?: number;
    max?: number | null;
    min?: number | null;
}
