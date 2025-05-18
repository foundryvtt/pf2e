import { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_module.mjs";
import { ApplicationV2, HandlebarsApplicationMixin, HandlebarsTemplatePart } from "../../api/_module.mjs";

export default class InvitationLinks extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    protected override _prepareContext(): Promise<ApplicationRenderContext>;
}
