import {
    ApplicationConfiguration,
    ApplicationFormConfiguration,
    ApplicationRenderContext,
} from "@client/applications/_module.mjs";
import World from "@client/packages/world.mjs";
import ApplicationV2 from "../../api/application.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/handlebars-application.mjs";

interface WorldConfigConfiguration extends ApplicationConfiguration {
    world: World;
}

/**
 * The World Management setup application
 */
export default class WorldConfig extends HandlebarsApplicationMixin(
    ApplicationV2<WorldConfigConfiguration, HandlebarsRenderOptions>,
) {
    /**
     * @param options Application configuration options
     */
    constructor(options: DeepPartial<WorldConfigConfiguration>);

    static override DEFAULT_OPTIONS: DeepPartial<WorldConfigConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * The World being configured.
     */
    world: World;

    override get title(): string;

    /**
     * Is this World to be created?
     */
    get isCreate(): boolean;

    protected override _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void;

    protected override _prepareContext(options: ApplicationRenderContext): Promise<ApplicationRenderContext>;
}
