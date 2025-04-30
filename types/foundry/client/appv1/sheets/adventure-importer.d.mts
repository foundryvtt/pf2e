import { Adventure } from "@client/documents/_module.mjs";
import { ApplicationV1HeaderButton } from "../api/application-v1.mjs";
import DocumentSheet, { DocumentSheetData, DocumentSheetV1Options } from "../api/document-sheet-v1.mjs";

/**
 * An interface for importing an adventure from a compendium pack.
 */
export default class AdventureImporter<TDocument extends Adventure> extends DocumentSheet<TDocument> {
    /**
     * An alias for the Adventure document
     */
    adventure: TDocument;

    override get isEditable(): boolean;

    static override get defaultOptions(): DocumentSheetV1Options;

    override getData(
        options?: Partial<DocumentSheetV1Options>,
    ): Promise<DocumentSheetData<TDocument> & { adventure: TDocument; contents: object[]; imported: boolean }>;

    activateListeners(html: JQuery): void;

    /**
     * Handle toggling the import all checkbox.
     * @param event  The change event.
     */
    protected _onToggleImportAll(event: Event): void;

    /**
     * Prepare a list of content types provided by this adventure.
     */
    protected _getContentList(): { icon: string; label: string; count: number }[];

    protected override _getHeaderButtons(): ApplicationV1HeaderButton[];

    override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

    /**
     * Mirror Adventure#import but call AdventureImporter#_importContent and AdventureImport#_prepareImportData
     */
    protected _importLegacy(formData: Record<string, unknown>): void;
}
