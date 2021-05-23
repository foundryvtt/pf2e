import { WallDocumentConstructor } from './constructors';

declare global {
    class WallDocument extends WallDocumentConstructor {}
    interface WallDocument {
        readonly data: foundry.data.WallData<WallDocument>;
    }
}
