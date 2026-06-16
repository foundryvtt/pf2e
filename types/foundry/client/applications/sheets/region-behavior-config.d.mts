import { FormNode } from "../_module.d.mjs";
import DocumentSheetV2, { DocumentSheetConfiguration, DocumentSheetRenderOptions } from "../api/document-sheet.d.mjs";
import HandlebarsApplicationMixin from "../api/handlebars-application.d.mjs";

export default class RegionBehaviorConfig<TDocument extends RegionBehavior> extends HandlebarsApplicationMixin(
    DocumentSheetV2<DocumentSheetConfiguration<RegionBehavior>>,
) {
    override get document(): TDocument;

    /**
     * Prepare form field structure for rendering.
     */
    protected _getFields(): FormNode[];

    // @ts-expect-error avoids type instantiation is excessively deep
    protected _prepareContext(options: DocumentSheetRenderOptions): Promise<object>;
}
