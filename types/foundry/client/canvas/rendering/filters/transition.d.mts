/**
 * A filter specialized for transition effects between a source object and a target texture.
 */
export default class TextureTransitionFilter extends AbstractBaseFilter {
    /**
     * Transition types for this shader.
     * @enum {string}
     */
    static get TYPES(): Readonly<{
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
    }>;
    static "__#193@#TYPES": Readonly<{
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
    }>;
    /**
     * Maps the type number to its string.
     * @type {ReadonlyArray<string>}
     */
    static "__#193@#TYPE_NUMBER_TO_STRING": ReadonlyArray<string>;
    /**
     * Maps the type string to its number.
     * @type {Readonly<{[type: string]: number}>}
     */
    static "__#193@#TYPE_STRING_TO_NUMBER": Readonly<{
        [type: string]: number;
    }>;
    /**
     * Types that requires padding
     * @type {ReadonlyArray<string>}
     */
    static "__#193@#PADDED_TYPES": ReadonlyArray<string>;
    /**
     * Animate a transition from a subject SpriteMesh/PIXI.Sprite to a given texture.
     * @param {PIXI.Sprite|SpriteMesh} subject                           The source mesh/sprite to apply a transition.
     * @param {PIXI.Texture} texture                                     The target texture.
     * @param {object} [options]
     * @param {string} [options.type=TYPES.FADE]                         The transition type (default to FADE.)
     * @param {string|symbol} [options.name]                             The name of the
     *   {@link foundry.canvas.animation.CanvasAnimation}.
     * @param {number} [options.duration=1000]                           The animation duration
     * @param {Function|string} [options.easing]                         The easing function of the animation
     * @returns {Promise<boolean>}   A Promise which resolves to true once the animation has concluded
     *                               or false if the animation was prematurely terminated
     */
    static animate(subject: PIXI.Sprite | SpriteMesh, texture: PIXI.Texture, { type, name, duration, easing }?: {
        type?: string | undefined;
        name?: string | symbol | undefined;
        duration?: number | undefined;
        easing?: string | Function | undefined;
    } | undefined): Promise<boolean>;
    /** @inheritDoc */
    static defaultUniforms: {
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
    set type(type: string);
    /**
     * The transition type (see {@link TextureTransitionFilter.TYPES}).
     * @type {string}
     * @defaultValue TextureTransitionFilter.TYPES.FADE
     */
    get type(): string;
    /**
     * Sampler target for this filter.
     * @param {PIXI.Texture} targetTexture
     */
    set targetTexture(targetTexture: PIXI.Texture<PIXI.Resource>);
    /** @inheritDoc */
    apply(filterManager: any, input: any, output: any, clear: any): void;
    #private;
}
import AbstractBaseFilter from "./base-filter.mjs";
import SpriteMesh from "../../containers/elements/sprite-mesh.mjs";
