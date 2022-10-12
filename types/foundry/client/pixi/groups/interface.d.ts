export {};

declare global {
    /** A container group which displays interface elements rendered above other canvas groups. */
    class InterfaceCanvasGroup extends PIXI.Container {
        /**
         * Display scrolling status text originating from this ObjectHUD container.
         * @param origin                  An origin point where the text should first emerge
         * @param content                 The text content to display
         * @param [options]               Options which customize the text animation
         * @param [options.duration=2000] The duration of the scrolling effect in milliseconds
         * @param [options.distance]      The distance in pixels that the scrolling text should travel
         * @param [options.anchor]        The original anchor point where the text first appears
         * @param [options.direction]     The direction in which the text scrolls
         * @param [options.jitter=0]      An amount of randomization between [0, 1] applied to the initial position
         * @param [options.textStyle={}]  Additional parameters of PIXI.TextStyle which are applied to the text
         */
        createScrollingText(origin: Point, content: string, options: CreateScrollingTextOptions): Promise<void | null>;
    }
}

interface CreateScrollingTextOptions extends Partial<PIXI.TextStyle> {
    duration?: number;
    distance?: number;
    jitter?: number;
    anchor: number;
    direction?: number;
}
