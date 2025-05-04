import User from "@client/documents/user.mjs";
import DocumentSheetV2, { DocumentSheetConfiguration, DocumentSheetRenderOptions } from "../api/document-sheet.mjs";
import HandlebarsApplicationMixin, { HandlebarsTemplatePart } from "../api/handlebars-application.mjs";

/**
 * The Application responsible for configuring a single User document.
 *
 * @param user      The User document being configured.
 * @param [options] Additional rendering options which modify the behavior of the form.
 */
export default class UserConfig<TDocument extends User> extends HandlebarsApplicationMixin(DocumentSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

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
