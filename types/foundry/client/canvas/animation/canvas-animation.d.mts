import { CanvasAnimationAttribute, CanvasAnimationData, CanvasAnimationOptions } from "./_types.mjs";

/**
 * A helper class providing utility methods for PIXI Canvas animation
 */
export default class CanvasAnimation {
    /**
     * The possible states of an animation.
     * @enum {number}
     */
    static get STATES(): Readonly<{
        /**
         * An error occurred during waiting or running the animation.
         */
        FAILED: -2;
        /**
         * The animation was terminated before it could complete.
         */
        TERMINATED: -1;
        /**
         * Waiting for the wait promise before the animation is started.
         */
        WAITING: 0;
        /**
         * The animation has been started and is running.
         */
        RUNNING: 1;
        /**
         * The animation was completed without errors and without being terminated.
         */
        COMPLETED: 2;
    }>;

    /**
     * The ticker used for animations.
     */
    static get ticker(): PIXI.Ticker;

    /**
     * Track an object of active animations by name, context, and function
     * This allows a currently playing animation to be referenced and terminated
     */
    static animations: Record<string | symbol, CanvasAnimationData>;

    /**
     * Apply an animation from the current value of some attribute to a new value
     * Resolve a Promise once the animation has concluded and the attributes have reached their new target
     *
     * @param attributes An array of attributes to animate
     * @param options Additional options which customize the animation
     *
     * @returns A Promise which resolves to true once the animation has concluded or false if the animation was
     * prematurely terminated
     *
     * @example Animate Token Position
     * ```js
     * let animation = [
     *   {
     *     parent: token,
     *     attribute: "x",
     *     to: 1000
     *   },
     *   {
     *     parent: token,
     *     attribute: "y",
     *     to: 2000
     *   }
     * ];
     * foundry.canvas.animation.CanvasAnimation.animate(attributes, {duration:500});
     * ```
     */
    static animate(attributes: CanvasAnimationAttribute[], options?: CanvasAnimationOptions): Promise<boolean>;

    /**
     * Retrieve an animation currently in progress by its name
     * @param name The animation name to retrieve
     * @returns The animation data, or undefined
     */
    static getAnimation(name: string | symbol): CanvasAnimationData;

    /**
     * If an animation using a certain name already exists, terminate it
     * @param name The animation name to terminate
     */
    static terminateAnimation(name: string | symbol): void;

    /**
     * Terminate all active animations in progress, forcibly resolving each one with `false`.
     * This method returns a Promise that resolves once all animations have been terminated and removed.
     * @returns A promise that resolves when all animations have been forcibly terminated.
     */
    static terminateAll(): Promise<void>;

    /**
     * Cosine based easing with smooth in-out.
     * @param pt The proportional animation timing on [0,1]
     * @returns The eased animation progress on [0,1]
     */
    static easeInOutCosine(pt: number): number;

    /**
     * Shallow ease out.
     * @param pt The proportional animation timing on [0,1]
     * @returns The eased animation progress on [0,1]
     */
    static easeOutCircle(pt: number): number;

    /**
     * Shallow ease in.
     * @param pt The proportional animation timing on [0,1]
     * @returns The eased animation progress on [0,1]
     */
    static easeInCircle(pt: number): number;
}
