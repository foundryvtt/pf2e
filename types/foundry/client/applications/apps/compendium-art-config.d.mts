import { ApplicationConfiguration, ApplicationRenderContext, FormFooterButton } from "../_types.mjs";
import { HandlebarsApplicationMixin, HandlebarsRenderOptions, HandlebarsTemplatePart } from "../api/_module.mjs";
import ApplicationV2 from "../api/application.mjs";

export interface CompendiumArtContext extends ApplicationRenderContext {
    config: foundry.helpers.CompendiumArtDescriptor[];
    buttons: FormFooterButton[];
}

/** An application for configuring compendium art priorities. */
export default class CompendiumArtConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override _prepareContext(options: HandlebarsRenderOptions): Promise<CompendiumArtContext>;
}
