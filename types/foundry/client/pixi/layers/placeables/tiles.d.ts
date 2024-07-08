/**
 * A PlaceablesLayer designed for rendering the visual Scene for a specific vertical cross-section.
 * @category - Canvas
 */

declare class TilesLayer<TObject extends Tile> extends PlaceablesLayer<TObject> {
    static override documentName: "Tile";

    static override get layerOptions(): PlaceablesLayerOptions;

    override get hookName(): string;

    override get hud(): TileHUD<TObject>;

    get tiles(): TObject[];

    override quadtree: CanvasQuadtree<TObject>;
}
