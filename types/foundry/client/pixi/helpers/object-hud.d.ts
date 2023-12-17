export {};

declare global {
    /**
     * An extension of PIXI.Container used as the interface frame for a PlaceableObject on the ControlsLayer
     * @see {@link PlaceableObject}
     * @see {@link ControlsLayer}
     */
    class ObjectHUD<T extends PlaceableObject> extends PIXI.Container {
        constructor(object: T);

        /** The object that this HUD container is linked to */
        object: T;

        /** Use the linked object's transform matrix to easily synchronize position */
        transform: PIXI.Transform;

        override readonly visible: boolean;

        override readonly renderable: boolean;

        /**
         * Display scrolling status text originating from this ObjectHUD container.
         * @param content The text content to display
         * @param [anchor=0]      The original anchor point where the text first appears
         * @param [direction=2]   The direction in which the text scrolls
         * @param [duration=2000] The duration of the scrolling effect in milliseconds
         * @param [jitter=0]      An amount of randomization between 0 and 1 to apply to the initial position
         * @param [textStyle={}]  Additional parameters of PIXI.TextStyle which are applied to the text
         * @returns The created PreciseText object which is scrolling
         */
        createScrollingText(
            content: string,
            { anchor, direction, duration, jitter, ...textStyle }?: ScrollingTextOptions,
        ): Promise<PreciseText | null>;

        /**
         * Orchestrate the animation of the scrolling text in this HUD
         * @param text     The PrecisText instance to animate
         * @param duration A desired duration of animation
         * @param dx       A horizontal distance to animate the text
         * @param dy       A vertical distance to animate the text
         */
        protected _animateScrollText(text: PreciseText, duration: number, dx?: number, dy?: number): Promise<void>;
    }
}

interface ScrollingTextOptions extends Partial<PIXI.ITextStyle> {
    anchor?: number;
    direction?: number;
    duration?: number;
    jitter?: number;
}
