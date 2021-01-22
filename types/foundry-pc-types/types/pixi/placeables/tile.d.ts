declare class Tile extends PlaceableObject<TilesLayer> {
    /** @override */
    static get embeddedName(): 'Tile';

    /**
     * Get the native aspect ratio of the base texture for the Tile sprite
     */
    get aspectRatio(): number;
}
