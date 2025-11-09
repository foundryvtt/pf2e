import {
    DocumentSheetConfiguration,
    DocumentSheetRenderContext,
    DocumentSheetV2,
    HandlebarsApplicationMixin,
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../api/_module.mjs";

/**
 * The Combatant configuration application.
 */
export default class CombatantConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override get title(): string;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<DocumentSheetRenderContext>;
}
