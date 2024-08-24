import type { HandlebarsTemplatePart } from "../api/handlebars-application.d.ts";
import HandlebarsApplicationMixin from "../api/handlebars-application.js";

/**
 * The Application responsible for configuring a single User document.
 *
 * @param user      The User document being configured.
 * @param [options] Additional rendering options which modify the behavior of the form.
 */
export default class UserConfig<TUser extends User> extends HandlebarsApplicationMixin(
    foundry.applications.api.DocumentSheetV2,
) {
    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override _prepareContext(options: DocumentSheetRenderOptions): Promise<UserConfigData<TUser>>;
}

declare global {
    interface UserConfigData<TUser extends User> {
        user: TUser;
        source: TUser["_source"];
        fields: unknown;
        characterWidget: (...args: unknown[]) => HTMLDivElement;
    }
}
