import { WallDocumentConstructor } from './constructors';

declare global {
    class WallDocument extends WallDocumentConstructor {}
    interface WallDocument {
        data: foundry.data.WallData<WallDocument>;
    }
}
