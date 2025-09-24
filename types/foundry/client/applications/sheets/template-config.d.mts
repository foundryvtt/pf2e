import {
    DocumentSheetConfiguration,
    DocumentSheetRenderContext,
    DocumentSheetRenderOptions,
    DocumentSheetV2,
    HandlebarsApplicationMixin,
    HandlebarsTemplatePart,
} from "../api/_module.mjs";

/**
 * The Application responsible for configuring a single MeasuredTemplate document within a parent Scene.
 */
export default class MeasuredTemplateConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override _prepareContext(options: DocumentSheetRenderOptions): Promise<DocumentSheetRenderContext>;
}
