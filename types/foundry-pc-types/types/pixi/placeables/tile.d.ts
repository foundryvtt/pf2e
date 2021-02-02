declare class Tile extends PlaceableObject {
    /** @override */
    static get embeddedName(): 'Tile';

    /** @override */
    get layer(): TilesLayer;

    /** @override */
    static get layer(): TilesLayer;

    /**
     * Get the native aspect ratio of the base texture for the Tile sprite
     */
    get aspectRatio(): number;
}
