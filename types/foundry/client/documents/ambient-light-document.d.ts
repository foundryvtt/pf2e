import type { CanvasBaseAmbientLight } from "./client-base-mixes.d.ts";

declare global {
    class AmbientLightDocument<TParent extends Scene | null> extends CanvasBaseAmbientLight<TParent> {
        /** Is this ambient light source global in nature? */
        get isGlobal(): boolean;
    }

    interface AmbientLightDocument<TParent extends Scene | null> extends CanvasBaseAmbientLight<TParent> {
        get object(): AmbientLight<this> | null;
    }
}
