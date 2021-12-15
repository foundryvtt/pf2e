/**
 * An extension of the default PIXI.Text object which forces double resolution.
 * At default resolution Text often looks blurry or fuzzy.
 */
declare class PreciseText extends PIXI.Text {
    constructor(text: string, style?: Partial<PIXI.ITextStyle> | PIXI.TextStyle, canvas?: HTMLCanvasElement);

    /**
     * Prepare a TextStyle object which merges the canvas defaults with user-provided options
     * @param [anchor]     A text anchor point from CONST.TEXT_ANCHOR_POINTS
     * @param [options={}] Additional options merged with the default TextStyle
     * @returns The prepared TextStyle
     */
    static getTextStyle({
        anchor,
        ...options
    }: {
        anchor?: number;
        options?: Partial<PIXI.ITextStyle>;
    }): PIXI.TextStyle;
}
