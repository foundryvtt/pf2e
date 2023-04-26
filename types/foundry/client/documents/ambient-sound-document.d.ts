import type { CanvasBaseAmbientSound } from "./client-base-mixes.d.ts";

declare global {
    class AmbientSoundDocument<TParent extends Scene | null> extends CanvasBaseAmbientSound<TParent> {}

    interface AmbientSoundDocument<TParent extends Scene | null> extends CanvasBaseAmbientSound<TParent> {
        readonly _object: AmbientSound<this> | null;
    }
}
