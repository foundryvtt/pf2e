/**
 * The DrawingsLayer subclass of PlaceablesLayer.
 * This layer implements a container for drawings.
 * @category - Canvas
 * @todo: fill in
 */
declare class DrawingsLayer<TDrawing extends Drawing = Drawing> extends PlaceablesLayer<TDrawing> {
    override quadtree: CanvasQuadtree<TDrawing>;
}
