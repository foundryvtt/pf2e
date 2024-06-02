import { HandlebarsApplicationDocumentSheet } from "../api/handlebars-application.js";

/**
 * The Application responsible for configuring a single User document.
 * @extends {DocumentSheet}
 *
 * @param user      The User document being configured.
 * @param [options] Additional rendering options which modify the behavior of the form.
 */
export default class UserConfig<TUser extends User> extends HandlebarsApplicationDocumentSheet<TUser> {
    static override PARTS: {
        form: {
            id: "form";
            template: "templates/sheets/user-config.hbs";
        };
    };

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
