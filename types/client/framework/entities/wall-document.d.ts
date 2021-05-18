import { _documentConstructors } from './constructors';

declare class WallDocument extends _documentConstructors.WallDocumentConstructor {}
declare interface WallDocument {
    data: foundry.data.WallData;
}
