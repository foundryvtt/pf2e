/**
 * Augment any PIXI.DisplayObject to assume bounds that are always aligned with the full visible screen.
 * The bounds of this container do not depend on its children but always fill the entire canvas.
 * @param Base Any PIXI DisplayObject subclass
 * @returns The decorated subclass with full canvas bounds
 */
export default function FullCanvasObjectMixin<TBase extends AbstractConstructorOf<PIXI.DisplayObject>>(Base: TBase) {
    abstract class FullCanvasObject extends Base {
        override calculateBounds(): void {}
    }

    return FullCanvasObject;
}
