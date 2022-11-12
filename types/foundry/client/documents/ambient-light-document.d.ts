import { AmbientLightDocumentConstructor } from "./constructors";

declare global {
    class AmbientLightDocument extends AmbientLightDocumentConstructor {
        /** Is this ambient light source global in nature? */
        get isGlobal(): boolean;
    }

    interface AmbientLightDocument {
        readonly parent: Scene | null;
    }
}
