import { CanvasBaseAmbientSound } from "./client-base-mixes.js";

declare global {
    class AmbientSoundDocument<TParent extends Scene | null> extends CanvasBaseAmbientSound<TParent> {}

    interface AmbientSoundDocument<TParent extends Scene | null> extends CanvasBaseAmbientSound<TParent> {
        readonly _object: AmbientSound<this> | null;
    }
}
