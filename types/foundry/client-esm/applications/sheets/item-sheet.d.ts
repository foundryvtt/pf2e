import type { DocumentSheetConfiguration } from "../api/document-sheet.d.ts";
import type { DocumentSheetV2 } from "../api/module.d.ts";

/** A base class for providing Item Sheet behavior using ApplicationV2. */
export default abstract class ItemSheetV2<TDocument extends Item> extends DocumentSheetV2<
    DocumentSheetConfiguration<TDocument>
> {
    static override DEFAULT_OPTIONS: Partial<DocumentSheetConfiguration>;

    /** The Item document managed by this sheet. */
    get item(): TDocument;

    /** The Actor instance which owns this Item, if any. */
    get actor(): TDocument["actor"];
}
