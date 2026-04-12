export default class SMAAFilter extends PIXI.Filter {
    constructor({
        threshold,
        localContrastAdaptionFactor,
        maxSearchSteps,
        maxSearchStepsDiag,
        cornerRounding,
        disableDiagDetection,
        disableCornerDetection,
    }?: Partial<SMAAFilterConfig>);

    /**
     * The presets.
     */
    static get PRESETS(): Record<"LOW" | "MEDIUM" | "HIGH" | "ULTRA", SMAAFilterConfig>;

    override apply(
        filterManager: unknown,
        input: unknown,
        output: unknown,
        clearMode: unknown,
        currentState: unknown,
    ): void;
}

export interface SMAAFilterConfig {
    /**
     * Specifies the threshold or sensitivity to edges. Lowering this value you will be able to detect more edges at the expense of performance. Range: [0, 0.5]. 0.1 is a reasonable value, and allows to catch most visible edges. 0.05 is a rather overkill value, that allows to catch 'em all.
     */
    threshold: number;
    /**
     * If there is an neighbor edge that has SMAA_LOCAL_CONTRAST_FACTOR times bigger contrast than current edge, current edge will be discarded.
     * This allows to eliminate spurious crossing edges, and is based on the fact that, if there is too much contrast in a direction, that will hide perceptually contrast in the other neighbors.
     */
    localContrastAdaptionFactor: number;
    /**
     * Specifies the maximum steps performed in the horizontal/vertical pattern searches, at each side of the pixel. In number of pixels, it's actually the double. So the maximum line length perfectly handled by, for example 16, is 64 (by perfectly, we meant that longer lines won't look as good, but still antialiased. Range: [0, 112].
     */
    maxSearchSteps: number;
    /**
     * Specifies the maximum steps performed in the diagonal pattern searches, at each side of the pixel. In this case we jump one pixel at time, instead of two. Range: [0, 20].
     */
    maxSearchStepsDiag: number;
    /**
     * Specifies how much sharp corners will be rounded. Range: [0, 100].
     */
    cornerRounding: number;
    /**
     * Is diagonal detection disabled?
     */
    disableDiagDetection: boolean;
    /**
     * Is corner detection disabled?
     */
    disableCornerDetection: boolean;
}
