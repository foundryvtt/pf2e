import { TokenAnimationData } from "@client/_types.mjs";
import Color from "@common/utils/color.mjs";

export interface CanvasAnimationAttribute {
    /** The attribute name being animated */
    attribute: string;

    /** The object within which the attribute is stored */
    parent: object;

    /** The destination value of the attribute */
    to: number | Color;

    /** An initial value of the attribute, otherwise `parent[attribute]` is used */
    from?: number | Color | undefined;

    /** The computed delta between to and from */
    delta?: number | undefined;

    /** The amount of the total delta which has been animated */
    done?: number | undefined;

    /** Is this a color animation that applies to RGB channels */
    color?: boolean | undefined;
}

export type CanvasAnimationEasingFunction =
    | "easeInOutCosine"
    | "easeOutCircle"
    | "easeInCircle"
    | ((percentage: number) => number);

export interface CanvasAnimationOptions {
    /** A DisplayObject which defines context to the PIXI.Ticker function */
    context?: PIXI.DisplayObject | undefined;

    /** A unique name which can be used to reference the in-progress animation */
    name?: string | symbol | undefined;

    /** A duration in milliseconds over which the animation should occur */
    duration?: number | undefined;

    /** The current time of the animation, in milliseconds */
    time?: number | undefined;

    /** A priority in PIXI.UPDATE_PRIORITY which defines when the animation should be evaluated related to others */
    priority?: number | undefined;

    /** An easing function used to translate animation time or the string name of a static member of CanvasAnimation */
    easing?: CanvasAnimationEasingFunction | undefined;

    /** A callback function which fires after every frame */
    ontick?: ((elapsedMS: number, animation: CanvasAnimationData, data: TokenAnimationData) => void) | undefined;

    /** The animation isn't started until this promise resolves */
    wait?: Promise<any> | undefined;
}

export interface CanvasAnimationData extends CanvasAnimationOptions {
    /** The animation function being executed each frame */
    fn: () => void;

    /** The attributes being animated */
    attributes: CanvasAnimationAttribute[];

    /** The current state of the animation (see {@link CanvasAnimation.STATES}) */
    state: number;

    /** A Promise which resolves once the animation is complete */
    promise: Promise<boolean>;

    /** The resolution function, allowing animation to be ended early */
    resolve: (completed: boolean) => void;

    /** The rejection function, allowing animation to be ended early */
    reject: (error: Error) => void;
}
