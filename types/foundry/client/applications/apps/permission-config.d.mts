import { ApplicationConfiguration, ApplicationRenderContext, FormFooterButton } from "../_types.mjs";
import { HandlebarsApplicationMixin, HandlebarsRenderOptions, HandlebarsTemplatePart } from "../api/_module.mjs";
import ApplicationV2 from "../api/application.mjs";

export interface PermissionConfigContext extends ApplicationRenderContext {
    roles: Record<keyof typeof CONST.USER_ROLES, string>;
    permissions: typeof CONST.USER_PERMISSIONS;
    buttons: FormFooterButton[];
}

/** An application for configuring the permissions which are available to each User role. */
export default class PermissionConfig extends HandlebarsApplicationMixin(
    ApplicationV2<ApplicationConfiguration, HandlebarsRenderOptions, PermissionConfigContext>,
) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    override _prepareContext(options: HandlebarsRenderOptions): Promise<PermissionConfigContext>;
}
