/**
 * A modified version of the PIXI.smooth.DashLineShader that supports an offset.
 * @internal
 */
export default class DashLineShader {
    /**
     * @param options      The options
     * @param options.dash The length of the dash
     * @param options.gap  The length of the gap
     * @param options.offset The offset of the dashes
     */
    constructor({ dash, gap, offset }?: { dash?: number; gap?: number; offset?: number } | undefined);
}
