/**
 * A PlaceablesLayer designed for rendering the visual Scene for a specific vertical cross-section.
 * @category - Canvas
 * @todo fill in
 */

declare class TilesLayer<TTile extends Tile> extends PlaceablesLayer<TTile> {
    static override documentName: "Tile";
    override quadtree: CanvasQuadtree<TTile>;
}
