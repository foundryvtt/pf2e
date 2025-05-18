import {
    DocumentSheetConfiguration,
    DocumentSheetRenderContext,
    DocumentSheetV2,
    HandlebarsApplicationMixin,
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../api/_module.mjs";

/** A generic application for configuring permissions for various Document types. */
export default class DocumentOwnershipConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override _prepareContext(options: HandlebarsRenderOptions): Promise<DocumentSheetRenderContext>;
}
