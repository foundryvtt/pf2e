import CategoryBrowser, { CategoryBrowserConfiguration } from "@client/applications/api/category-browser.mjs";

/**
 * A management app for configuring which Tours are available or have been completed.
 */
export default class ToursManagement extends CategoryBrowser {
    static override DEFAULT_OPTIONS: DeepPartial<CategoryBrowserConfiguration>;

    /* -------------------------------------------- */
    /*  Application Overrides                       */
    /* -------------------------------------------- */

    protected override _prepareCategoryData(): Promise<
        Record<string, { id: string; label: string; entries: object[] }>
    >;

    protected override _sortCategories(a: { id: string; label: string }, b: { id: string; label: string }): number;
}
