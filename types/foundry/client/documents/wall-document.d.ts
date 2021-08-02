import { WallDocumentConstructor } from "./constructors";

declare global {
    class WallDocument extends WallDocumentConstructor {}

    interface WallDocument {
        readonly parent: Scene | null;

        readonly _object: Wall;
    }
}
