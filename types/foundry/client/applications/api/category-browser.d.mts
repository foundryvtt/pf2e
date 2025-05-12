import {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationRenderContext,
    ApplicationTabsConfiguration,
} from "../_types.mjs";
import ApplicationV2 from "./application.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "./handlebars-application.mjs";

export interface CategoryBrowserConfiguration extends ApplicationConfiguration {
    /** Where this application displays is a list of tagged FVTT packages */
    packageList: boolean;
    /**
     * The initial category tab: a `null` value will result in an initial active tab that corresponds with the first
     * category by insertion order.
     */
    initialCategory: string | null;
    /** Additional Template partials for specific use with this class */
    subtemplates: {
        category: string;
        filters: string | null;
        sidebarFooter: string | null;
    };
}

/**
 * An abstract class responsible for displaying a 2-pane Application that allows for entries to be grouped and filtered
 * by category.
 */
export default abstract class CategoryBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<CategoryBrowserConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * Is category and/or entry data loaded? Most subclasses will already have their data close at hand.
     */
    protected get _dataLoaded(): boolean;

    protected override _initializeApplicationOptions(
        options: DeepPartial<CategoryBrowserConfiguration>,
    ): CategoryBrowserConfiguration;

    protected override _configureRenderParts(options: HandlebarsRenderOptions): Record<string, HandlebarsTemplatePart>;

    /**
     * Perform a text search without a KeyboardEvent.
     */
    search(query: string): void;

    override render(options: HandlebarsRenderOptions): Promise<this>;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<ApplicationRenderContext>;

    /**
     * Prepare the structure of category data which is rendered in this configuration form.
     */
    protected abstract _prepareCategoryData(): Promise<
        Record<string, { id: string; label: string; entries: object[] }>
    >;

    /**
     * An optional method to make a potentially long-running request to load category data: a temporary message will be
     * displayed until completion.
     */
    protected _loadCategoryData(): Promise<void>;

    /**
     * Reusable logic for how categories are sorted in relation to each other.
     */
    protected _sortCategories(
        a: { label: string; [key: string]: unknown },
        b: { label: string; [key: string]: unknown },
    ): number;

    protected override _getTabsConfig(group: string): ApplicationTabsConfiguration | null;

    protected override _tearDown(options: ApplicationClosingOptions): void;

    protected override _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle search inputs.
     */
    protected _onSearchFilter(_event: KeyboardEvent, query: string, rgx?: RegExp, content?: HTMLElement | null): void;
}
