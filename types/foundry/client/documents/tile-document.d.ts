import { CanvasBaseTile } from "./client-base-mixes.mjs";

declare global {
    class TileDocument<TParent extends Scene | null> extends CanvasBaseTile<TParent> {}

    interface TileDocument<TParent extends Scene | null> extends CanvasBaseTile<TParent> {
        readonly _object: Tile<this> | null;
    }
}
