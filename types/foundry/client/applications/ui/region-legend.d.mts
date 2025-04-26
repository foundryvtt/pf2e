import Region from "@client/canvas/placeables/region.mjs";
import {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationRenderContext,
    ApplicationRenderOptions,
} from "../_types.mjs";
import ApplicationV2 from "../api/application.mjs";
import HandlebarsApplicationMixin, { HandlebarsTemplatePart } from "../api/handlebars-application.mjs";

/**
 * Scene Region Legend.
 */
export default class RegionLegend extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /** The currently viewed elevation range. */
    elevation: { bottom: number; top: number };

    protected override _configureRenderOptions(options: Partial<ApplicationRenderOptions>): void;

    protected override _canRender(options: ApplicationRenderOptions): false | void;

    protected override _renderFrame(options: ApplicationRenderOptions): Promise<HTMLElement>;

    override close(options?: ApplicationClosingOptions): Promise<this>;

    protected override _onFirstRender(
        context: ApplicationRenderContext,
        options: ApplicationRenderOptions,
    ): Promise<void>;

    protected override _onRender(context: ApplicationRenderContext, options: ApplicationRenderOptions): Promise<void>;

    protected override _onClose(options: ApplicationClosingOptions): void;

    protected _prepareContext(options: ApplicationRenderOptions): Promise<ApplicationRenderContext>;

    /**
     * Is this Region visible in this RegionLegend?
     * @param region  The region
     * @internal
     */
    _isRegionVisible(region: Region): boolean;

    /**
     * Highlight a hovered region in the legend.
     * @param region  The Region
     * @param hover   Whether they are being hovered in or out.
     * @internal
     */
    _hoverRegion(region: Region, hover: boolean): void;
}
