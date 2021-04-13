/**
 * An extension of the default PIXI.Text object which forces double resolution.
 * At default resolution Text often looks blurry or fuzzy.
 */
declare class PreciseText extends PIXI.Text {
    constructor(...args: ConstructorParameters<typeof PIXI.Text>);
}
