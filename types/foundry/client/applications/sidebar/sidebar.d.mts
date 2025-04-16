import { ApplicationConfiguration, ApplicationRenderContext } from "../_types.mjs";
import ApplicationV2 from "../api/application.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../api/handlebars-application.mjs";
import AbstractSidebarTab from "./sidebar-tab.mjs";

declare interface SidebarTabDescriptor {
    /** The tab's tooltip. */
    tooltip: string;
    /** The tab's Font Awesome icon class. */
    icon: string;
}

/**
 * The main sidebar application.
 */
export default class Sidebar extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    /**
     * Tab configuration.
     */
    TABS: Record<string, SidebarTabDescriptor>;

    override tabGroups: { primary: string };

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Whether the sidebar is currently expanded.
     */
    get expanded(): boolean;

    /**
     * The currently popped-out sidebar tabs.
     */
    popouts: Record<string, AbstractSidebarTab>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    _configureRenderOptions(options: HandlebarsRenderOptions): void;

    _onFirstRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    protected override _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<ApplicationRenderContext>;

    /**
     * Prepare render context for the tabs.
     * @param context Shared context provided by _prepareContext.
     * @param options Options for configuring rendering behavior.
     */
    protected _prepareTabContext(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    protected override _renderHTML(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<Record<string, HTMLElement>>;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    protected override _onClickTab(event: PointerEvent): void;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    override changeTab(
        tab: string,
        group: string,
        options?: { event?: Event; navElement?: HTMLElement; force?: boolean; updatePosition?: boolean },
    ): void;

    /**
     * Collapse the sidebar.
     */
    collapse(): void;

    /**
     * Expand the sidebar.
     */
    expand(): void;

    /**
     * Toggle the expanded state of the sidebar.
     * @param expanded Force the expanded state to the provided value, otherwise toggle the state.
     * @fires {hookEvents:collapseSidebar}
     */
    toggleExpanded(expanded?: boolean): void;
}
