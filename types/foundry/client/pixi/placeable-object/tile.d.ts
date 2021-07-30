declare class Tile extends PlaceableObject<TileDocument> {
    static override embeddedName: 'Tile';

    /**
     * Get the native aspect ratio of the base texture for the Tile sprite
     */
    get aspectRatio(): number;
}

declare interface Tile extends PlaceableObject<TileDocument> {
    get layer(): TilesLayer<this>;
}
