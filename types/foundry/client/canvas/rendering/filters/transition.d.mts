import SpriteMesh from "../../containers/elements/sprite-mesh.mjs";
import AbstractBaseFilter from "./base-filter.mjs";

/**
 * A filter specialized for transition effects between a source object and a target texture.
 */
export default class TextureTransitionFilter extends AbstractBaseFilter {
    /** Transition types for this shader. */
    static get TYPES(): {
        FADE: "fade";
        SWIRL: "swirl";
        WATER_DROP: "waterDrop";
        MORPH: "morph";
        CROSSHATCH: "crosshatch";
        WIND: "wind";
        WAVES: "waves";
        WHITE_NOISE: "whiteNoise";
        HOLOGRAM: "hologram";
        HOLE: "hole";
        HOLE_SWIRL: "holeSwirl";
        GLITCH: "glitch";
        DOTS: "dots";
    };

    /** Maps the type number to its string. */
    static TYPE_NUMBER_TO_STRING: Readonly<string[]>;

    /** Maps the type string to its number. */
    static TYPE_STRING_TO_NUMBER: Readonly<{
        [type: string]: number;
    }>;

    /** Types that requires padding */
    static PADDED_TYPES: Readonly<string[]>;

    /**
     * Animate a transition from a subject SpriteMesh/PIXI.Sprite to a given texture.
     * @param subject                    The source mesh/sprite to apply a transition.
     * @param texture                    The target texture.
     * @param [options]
     * @param [options.type=TYPES.FADE]  The transition type (default to FADE.)
     * @param [options.name]             The name of the {@link foundry.canvas.animation.CanvasAnimation}.
     * @param [options.duration=1000]    The animation duration
     * @param [options.easing]           The easing function of the animation
     * @returns A Promise which resolves to true once the animation has concluded or false if the animation was
     *          prematurely terminated
     */
    static animate(
        subject: PIXI.Sprite | SpriteMesh,
        texture: PIXI.Texture,
        options?: {
            type?: string | undefined;
            name?: string | symbol | undefined;
            duration?: number | undefined;
            easing?: string | Function | undefined;
        },
    ): Promise<boolean>;

    static override defaultUniforms: {
        tintAlpha: number[];
        targetTexture: null;
        progress: number;
        rotation: number;
        anchor: {
            x: number;
            y: number;
        };
        type: number;
        filterMatrix: PIXI.Matrix;
        filterMatrixInverse: PIXI.Matrix;
        targetUVMatrix: PIXI.Matrix;
    };

    /**
     * The transition type (see {@link TextureTransitionFilter.TYPES}).
     * @defaultValue TextureTransitionFilter.TYPES.FADE
     */
    get type(): TextureTransitionType;

    set type(type: TextureTransitionType);

    /**
     * Sampler target for this filter.
     * @param  targetTexture
     */
    set targetTexture(targetTexture: PIXI.Texture<PIXI.Resource>);

    apply(
        filterManager: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clearMode?: PIXI.CLEAR_MODES,
        _currentState?: PIXI.FilterState,
    ): void;
}

export type TextureTransitionType = (typeof TextureTransitionFilter.TYPES)[keyof typeof TextureTransitionFilter.TYPES];
