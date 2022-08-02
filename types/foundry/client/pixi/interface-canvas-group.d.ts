export {};

declare global {
    /** A container group which displays interface elements rendered above other canvas groups. */
    class InterfaceCanvasGroup extends PIXI.Container {
        /**
         * Display scrolling status text originating from this ObjectHUD container.
         * @param {Point} origin            An origin point where the text should first emerge
         * @param {string} content          The text content to display
         * @param {object} [options]        Options which customize the text animation
         * @param {number} [options.duration=2000]  The duration of the scrolling effect in milliseconds
         * @param {number} [options.distance]       The distance in pixels that the scrolling text should travel
         * @param {number} [options.anchor]         The original anchor point where the text first appears
         * @param {number} [options.direction]      The direction in which the text scrolls
         * @param {number} [options.jitter=0]       An amount of randomization between [0, 1] applied to the initial position
         * @param {object} [options.textStyle={}]   Additional parameters of PIXI.TextStyle which are applied to the text
         */
        createScrollingText(
            origin: Point,
            content: string,
            options: {
                duration?: number;
                distance?: number;
                jitter?: number;
                anchor: number;
                direction?: number;
                textStyle: Partial<PIXI.TextStyle>;
            }
        ): Promise<void | null>;
    }
}
