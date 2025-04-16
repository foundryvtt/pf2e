/**
 * @import {CanvasAnimationAttribute} from "./_types.mjs"
 * @import {CanvasAnimationOptions} from "./_types.mjs"
 * @import {CanvasAnimationData} from "./_types.mjs"
 */
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
    static "__#59@#STATES": Readonly<{
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
     * @type {PIXI.Ticker}
     */
    static get ticker(): PIXI.Ticker;
    /**
     * Track an object of active animations by name, context, and function
     * This allows a currently playing animation to be referenced and terminated
     * @type {Record<string|symbol, CanvasAnimationData>}
     */
    static animations: Record<string | symbol, CanvasAnimationData>;
    /**
     * Apply an animation from the current value of some attribute to a new value
     * Resolve a Promise once the animation has concluded and the attributes have reached their new target
     *
     * @param {CanvasAnimationAttribute[]} attributes   An array of attributes to animate
     * @param {CanvasAnimationOptions} options          Additional options which customize the animation
     *
     * @returns {Promise<boolean>}                      A Promise which resolves to true once the animation has concluded
     *                                                  or false if the animation was prematurely terminated
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
    static animate(attributes: CanvasAnimationAttribute[], { context, name, time, duration, easing, ontick, priority, wait }?: CanvasAnimationOptions): Promise<boolean>;
    /**
     * Retrieve an animation currently in progress by its name
     * @param {string|symbol} name      The animation name to retrieve
     * @returns {CanvasAnimationData}   The animation data, or undefined
     */
    static getAnimation(name: string | symbol): CanvasAnimationData;
    /**
     * If an animation using a certain name already exists, terminate it
     * @param {string | symbol} name      The animation name to terminate
     */
    static terminateAnimation(name: string | symbol): void;
    /**
     * Terminate all active animations in progress, forcibly resolving each one with `false`.
     * This method returns a Promise that resolves once all animations have been terminated and removed.
     * @returns {Promise<void>} A promise that resolves when all animations have been forcibly terminated.
     */
    static terminateAll(): Promise<void>;
    /**
     * Cosine based easing with smooth in-out.
     * @param {number} pt     The proportional animation timing on [0,1]
     * @returns {number}      The eased animation progress on [0,1]
     */
    static easeInOutCosine(pt: number): number;
    /**
     * Shallow ease out.
     * @param {number} pt     The proportional animation timing on [0,1]
     * @returns {number}      The eased animation progress on [0,1]
     */
    static easeOutCircle(pt: number): number;
    /**
     * Shallow ease in.
     * @param {number} pt     The proportional animation timing on [0,1]
     * @returns {number}      The eased animation progress on [0,1]
     */
    static easeInCircle(pt: number): number;
    /**
     * Generic ticker function to implement the animation.
     * This animation wrapper executes once per frame for the duration of the animation event.
     * Once the animated attributes have converged to their targets, it resolves the original Promise.
     * The user-provided ontick function runs each frame update to apply additional behaviors.
     *
     * @param {number} elapsedMS                The incremental time in MS which has elapsed (uncapped)
     * @param {CanvasAnimationData} animation   The animation which is being performed
     */
    static "__#59@#animateFrame"(elapsedMS: number, animation: CanvasAnimationData): void;
    /**
     * Update a single attribute according to its animation completion percentage
     * @param {CanvasAnimationAttribute} attribute    The attribute being animated
     * @param {number} percentage                     The animation completion percentage
     */
    static "__#59@#updateAttribute"(attribute: CanvasAnimationAttribute, percentage: number): void;
}
import type { CanvasAnimationData } from "./_types.mjs";
import type { CanvasAnimationAttribute } from "./_types.mjs";
import type { CanvasAnimationOptions } from "./_types.mjs";
