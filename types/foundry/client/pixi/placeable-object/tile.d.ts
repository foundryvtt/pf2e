declare class Tile extends PlaceableObject<TileDocument> {
    static override embeddedName: 'Tile';

    get layer(): TilesLayer;

    /** @override */
    static get layer(): TilesLayer;

    /**
     * Get the native aspect ratio of the base texture for the Tile sprite
     */
    get aspectRatio(): number;
}
