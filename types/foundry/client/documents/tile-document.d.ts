import { TileDocumentConstructor } from './constructors';

declare global {
    class TileDocument extends TileDocumentConstructor {}

    interface TileDocument {
        readonly parent: Scene | null;

        readonly _object: Tile;
    }
}
