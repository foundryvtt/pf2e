import { CanvasBaseWall } from "./client-base-mixes.js";

declare global {
    class WallDocument<TParent extends Scene | null> extends CanvasBaseWall<TParent> {}

    interface WallDocument<TParent extends Scene | null> extends CanvasBaseWall<TParent> {
        get object(): Wall<this> | null;
    }
}
