/**
 * Augment any PIXI.DisplayObject to assume bounds that are always aligned with the full visible screen.
 * The bounds of this container do not depend on its children but always fill the entire canvas.
 * @param Base Any PIXI DisplayObject subclass
 */
export default function FullCanvasObjectMixin<TObject extends PIXI.DisplayObject>(
    Base: ConstructorOf<TObject>,
): {
    new (): {
        calculateBounds(): void;
    } & TObject;
};
