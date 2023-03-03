import { WallDocumentConstructor } from "./constructors";

declare global {
    class WallDocument<TParent extends Scene | null> extends WallDocumentConstructor {}

    interface WallDocument<TParent extends Scene | null> {
        readonly parent: TParent;

        readonly _object: Wall<this>;
    }
}
