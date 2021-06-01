import { AmbientLightDocumentConstructor } from './constructors';

declare global {
    class AmbientLightDocument extends AmbientLightDocumentConstructor {}

    interface AmbientLightDocument {
        readonly parent: Scene | null;
    }
}
