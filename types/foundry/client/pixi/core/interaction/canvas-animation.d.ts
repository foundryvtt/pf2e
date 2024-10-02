/* eslint-disable @typescript-eslint/no-unsafe-function-type */

interface CanvasAnimationAttribute {
    /** The attribute name being animated */
    attribute: string;
    /** The object within which the attribute is stored */
    parent: Record<string, unknown>;
    /** The destination value of the attribute */
    to: number;
    /** An initial value of the attribute, otherwise parent[attribute] is used */
    from?: number;
    /** The computed delta between to and from */
    delta?: number;
    /** The amount of the total delta which has been animated */
    done?: number;
}

interface CanvasAnimationOptions<TObject extends PIXI.DisplayObject = PIXI.DisplayObject> {
    /** A DisplayObject which defines context to the PIXI.Ticker function */
    context?: TObject;
    /** A unique name which can be used to reference the in-progress animation */
    name?: string | symbol | null;
    /** A duration in milliseconds over which the animation should occur */
    duration?: number;
    /**
     * A priority in PIXI.UPDATE_PRIORITY which defines when the animation
     * should be evaluated related to others
     */
    priority?: number;
    /**
     * An easing function used to translate animation time or the string name
     *of a static member of the CanvasAnimation class
     */
    easing?: Function | string;
    /** A callback function which fires after every frame */
    ontick?: string | ((frame: number, data: CanvasAnimationData) => void);
    /** The animation isn't started until this promise resolves */
    wait?: Promise<unknown>;
}

interface CanvasAnimationData extends CanvasAnimationOptions {
    /** The animation function being executed each frame */
    fn: Function;
    /** The current time of the animation, in milliseconds */
    time: number;
    /** The attributes being animated */
    attributes: CanvasAnimationAttribute[];
    /** [promise] A Promise which resolves once the animation is complete */
    promise?: Promise<unknown>;
    /** The resolution function, allowing animation to be ended early */
    resolve?: Function;
    /** The rejection function, allowing animation to be ended early */
    reject?: Function;
}
