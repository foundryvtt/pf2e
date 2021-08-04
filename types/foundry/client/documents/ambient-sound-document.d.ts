import { AmbientSoundDocumentConstructor } from "./constructors";

declare global {
    class AmbientSoundDocument extends AmbientSoundDocumentConstructor {}

    interface AmbientSoundDocument {
        readonly parent: Scene | null;
    }
}
