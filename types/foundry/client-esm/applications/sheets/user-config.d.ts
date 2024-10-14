import type DocumentSheetV2 from "../api/document-sheet.d.ts";
import type { DocumentSheetConfiguration, DocumentSheetRenderOptions } from "../api/document-sheet.d.ts";
import type HandlebarsApplicationMixin from "../api/handlebars-application.d.ts";
import type { HandlebarsTemplatePart } from "../api/handlebars-application.d.ts";

/**
 * The Application responsible for configuring a single User document.
 *
 * @param user      The User document being configured.
 * @param [options] Additional rendering options which modify the behavior of the form.
 */
export default class UserConfig<TDocument extends User> extends HandlebarsApplicationMixin(DocumentSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override get title(): string;

    override _prepareContext(options: DocumentSheetRenderOptions): Promise<UserConfigData<TDocument>>;
}

export default interface UserConfig<TDocument extends User> {
    get document(): TDocument;
}

export interface UserConfigData<TUser extends User> {
    user: TUser;
    source: TUser["_source"];
    fields: unknown;
    characterWidget: (...args: unknown[]) => HTMLDivElement;
}
