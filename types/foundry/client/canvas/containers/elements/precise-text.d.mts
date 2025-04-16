/**
 * An extension of the default PIXI.Text object which forces double resolution.
 * At default resolution Text often looks blurry or fuzzy.
 */
export default class PreciseText extends PIXI.Text {
    /**
     * Creates an instance of PreciseText.
     */
    constructor(...args: ConstructorParameters<typeof PIXI.Text>);

    /**
     * Prepare a TextStyle object which merges the canvas defaults with user-provided options
     * @param options Additional options merged with the default TextStyle
     * @param options.anchor A text anchor point from CONST.TEXT_ANCHOR_POINTS
     * @returns The prepared TextStyle
     */
    static getTextStyle({
        anchor,
        ...options
    }?: {
        anchor?: number;
        options?: Partial<PIXI.ITextStyle>;
    }): PIXI.TextStyle;
}
