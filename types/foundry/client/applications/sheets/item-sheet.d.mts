import Item from "@client/documents/item.mjs";
import DocumentSheetV2, { DocumentSheetConfiguration } from "../api/document-sheet.mjs";

/** A base class for providing Item Sheet behavior using ApplicationV2. */
export default abstract class ItemSheetV2<TDocument extends Item> extends DocumentSheetV2<
    DocumentSheetConfiguration<TDocument>
> {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    /** The Item document managed by this sheet. */
    get item(): TDocument;

    /** The Actor instance which owns this Item, if any. */
    get actor(): TDocument["actor"];
}
