import type DocumentSheetV2 from "../api/document-sheet.d.ts";

/** A base class for providing Item Sheet behavior using ApplicationV2. */
export default class ItemSheetV2<TDocument extends Item> extends DocumentSheetV2<TDocument> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    /** The Item document managed by this sheet. */
    get item(): TDocument;

    /** The Actor instance which owns this Item, if any. */
    get actor(): TDocument["actor"];
}
