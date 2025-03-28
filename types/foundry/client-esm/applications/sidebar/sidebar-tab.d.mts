import type { ApplicationConfiguration, ApplicationRenderOptions } from "../_types.d.ts";
import type ApplicationV2 from "../api/application.d.ts";

/**
 * The sidebar tab interface that allows any sidebar tab to also be rendered as a popout.
 */
export default abstract class AbstractSidebarTab<
    TConfig extends ApplicationConfiguration,
    TRenderOptions extends ApplicationRenderOptions,
> extends ApplicationV2<TConfig, TRenderOptions> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    static override emittedEvents: readonly string[];

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Whether this tab is currently active in the sidebar.
     */
    get active(): boolean;

    /**
     * Whether this is the popped-out tab or the in-sidebar one.
     */
    get isPopout(): boolean;

    /**
     * A reference to the popped-out version of this tab, if one exists.
     */
    get popout(): this | undefined;

    /**
     * The base name of the sidebar tab.
     */
    get tabName(): string;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _initializeApplicationOptions(options: Partial<TConfig>): TConfig;

    protected override _prepareContext(options: TRenderOptions): Promise<object>;

    protected override _renderFrame(options: TRenderOptions): Promise<HTMLElement>;

    override render(options: TRenderOptions, _options: RenderOptions): Promise<this>;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Activate this tab in the sidebar.
     */
    activate(): void;

    /**
     * Pop-out this sidebar tab as a new application.
     */
    renderPopout(): Promise<this>;

    /* -------------------------------------------- */
    /*  Events                                      */
    /* -------------------------------------------- */

    /**
     * Actions performed when this tab is activated in the sidebar.
     */
    protected _onActivate(): void;

    protected override _onClose(options: TRenderOptions): void;

    /**
     * Actions performed when this tab is deactivated in the sidebar.
     */
    protected _onDeactivate(): void;

    protected override _onFirstRender(context: object, options: TRenderOptions): Promise<void>;
}
