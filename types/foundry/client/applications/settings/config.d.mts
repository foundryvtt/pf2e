import CategoryBrowser, { CategoryBrowserConfiguration } from "../api/category-browser.mjs";

/**
 * @import {ApplicationClickAction, ApplicationFormSubmission} from "../_types.mjs";
 */

/**
 * The Application responsible for displaying and editing the client and world settings for this world.
 * This form renders the settings defined via the game.settings.register API which have config = true
 */
export default class SettingsConfig extends CategoryBrowser {
    static override DEFAULT_OPTIONS: DeepPartial<CategoryBrowserConfiguration>;

    protected override _prepareCategoryData(): Promise<
        Record<string, { id: string; label: string; entries: object[] }>
    >;

    /**
     * Classify what Category an Action belongs to
     * @param namespace The entry to classify
     * @returns The category the entry belongs to
     */
    protected _categorizeEntry(namespace: string): { id: string; label: string };

    /**
     * Sort categories in order of core, system, and finally modules.
     */
    protected override _sortCategories(a: { id: string; label: string }, b: { id: string; label: string }): number;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Confirm if the user wishes to reload the application.
     * @param options Additional options to configure the prompt.
     * @param options.world Whether to reload all connected clients as well.
     */
    static reloadConfirm(options?: { world?: boolean }): Promise<void>;
}
