import type { CanvasBaseWall } from "./client-base-mixes.d.ts";

declare global {
    class WallDocument<TParent extends Scene | null> extends CanvasBaseWall<TParent> {}

    interface WallDocument<TParent extends Scene | null> extends CanvasBaseWall<TParent> {
        get object(): Wall<this> | null;
    }
}
