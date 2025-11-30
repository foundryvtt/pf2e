import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import type { TableResultSource } from "@common/documents/table-result.d.mts";
import { CompendiumDirectoryPF2e } from "@module/apps/sidebar/compendium-directory.ts";
import { ErrorPF2e, htmlQuery, sluggify } from "@util";
import MiniSearch from "minisearch";
import * as R from "remeda";
import { CompendiumBrowser, CompendiumBrowserOpenTabOptions } from "../browser.ts";
import { BrowserTabs, ContentTabName } from "../data.ts";
import type { BrowserFilter, CheckboxOptions, CompendiumBrowserIndexData, RangesInputData, TraitData } from "./data.ts";

export abstract class CompendiumBrowserTab {
    /** A reference to the parent CompendiumBrowser */
    protected browser: CompendiumBrowser;
    /** The filter schema for this tab; The tabs filters are rendered based on this.*/
    filterData?: BrowserFilter = $state();
    /** Current results. These are automatically refreshed when the filter changes */
    results: CompendiumBrowserIndexData[] = $derived.by(() => {
        if (!this.filterData) return [];
        this.browser.resetListElement();
        const searchText = fa.ux.SearchFilter.cleanQuery(this.filterData.search.text);
        if (searchText) {
            const searchResult = this.searchEngine.search(searchText);
            return this.sortResult(searchResult.filter(this.filterIndexData.bind(this)));
        }
        return this.sortResult(this.indexData.filter(this.filterIndexData.bind(this)));
    });
    /** The maximum number of items shown in the result list element */
    resultLimit = $state(CompendiumBrowser.RESULT_LIMIT);
    /** An unmodified copy of this.filterData */
    declare defaultFilterData: this["filterData"];
    /** The full CompendiumIndex of this tab */
    protected indexData: CompendiumBrowserIndexData[] = [];
    /** Is this tab initialized? */
    isInitialized = false;
    /** The total count of items in the currently filtered index */
    totalItemCount = 0;
    /** The name of this tab */
    abstract tabName: ContentTabName;
    /** The label for this tab. Can be a translation string */
    protected abstract tabLabel: string;
    /** Whether this tab is visible in the browser */
    visible = $state(true);
    /** Minisearch */
    declare searchEngine: MiniSearch<CompendiumBrowserIndexData>;
    /** Names of the document fields to be indexed. */
    searchFields: string[] = [];
    /** Names of fields to store, so that search results would include them.
     *  By default none, so resuts would only contain the id field. */
    storeFields: string[] = [];

    /** Maximum size to create a roll table from as a sanity check, erring towards still too large. */
    #MAX_TABLE_SIZE = 1000;

    /** The localized label for this tab */
    get label(): string {
        return game.i18n.localize(this.tabLabel);
    }

    /** Whether this tab is only visible to a GM */
    get isGMOnly(): boolean {
        return false;
    }

    constructor(browser: CompendiumBrowser) {
        this.browser = browser;
    }

    /** Initialize this tab */
    async init(force?: boolean): Promise<void> {
        if (this.isInitialized && !force) return;

        // Load the index and populate filter data
        await this.loadData();

        // Initialize MiniSearch
        const wordSegmenter =
            "Segmenter" in Intl
                ? new Intl.Segmenter(game.i18n.lang, { granularity: "word" })
                : // Firefox >:(
                  {
                      segment(term: string): { segment: string }[] {
                          return [{ segment: term }];
                      },
                  };
        this.searchEngine = new MiniSearch({
            fields: this.searchFields,
            idField: "uuid",
            processTerm: (term): string[] | null => {
                if (term.length <= 1 || CompendiumDirectoryPF2e.STOP_WORDS.has(term)) {
                    return null;
                }
                return Array.from(wordSegmenter.segment(term))
                    .map((t) =>
                        fa.ux.SearchFilter.cleanQuery(t.segment.toLocaleLowerCase(game.i18n.lang)).replace(/['"]/g, ""),
                    )
                    .filter((t) => t.length > 1);
            },
            storeFields: this.storeFields,
            searchOptions: { combineWith: "AND", prefix: true },
        });
        this.searchEngine.addAll(this.indexData);

        // Set defaultFilterData for resets
        this.defaultFilterData = fu.deepClone(this.filterData);
        // Initialization complete
        this.isInitialized = true;
    }

    /** Open this tab
     * @param filter An optional initial filter for this tab
     */
    async open(options?: CompendiumBrowserOpenTabOptions): Promise<void> {
        if (options?.filter && !this.isInitialized) {
            throw ErrorPF2e("Tried to pass filter data to an uninitialized tab!");
        }
        return this.browser.openTab(this.tabName, options);
    }

    /** Returns a clean copy of the filterData for this tab. Initializes the tab if necessary. */
    async getFilterData(): Promise<this["filterData"]> {
        if (!this.isInitialized) {
            await this.init();
        }
        return fu.deepClone(this.defaultFilterData);
    }

    /** Reset all filters */
    resetFilters(): void {
        this.filterData = fu.deepClone(this.defaultFilterData);
    }

    /** Check this tabs type */
    isOfType<T extends ContentTabName>(...types: T[]): this is BrowserTabs[T];
    isOfType(...types: string[]): boolean {
        return types.some((t) => this.tabName === t);
    }

    /** Load and prepare the compendium index and set filter options */
    protected abstract loadData(): Promise<void>;

    /** Prepare the the filterData object of this tab */
    protected abstract prepareFilterData(): this["filterData"];

    /** Filter indexData */
    protected abstract filterIndexData(entry: CompendiumBrowserIndexData): boolean;

    protected filterTraits(
        traits: string[],
        selected: TraitData["selected"],
        condition: TraitData["conjunction"],
    ): boolean {
        const selectedTraits = selected.filter((s) => !s.not).map((s) => s.value);
        const notTraits = selected.filter((t) => t.not).map((s) => s.value);
        if (notTraits.some((t) => traits.includes(t))) {
            return false;
        }
        if (selectedTraits.length) {
            return condition === "and"
                ? selectedTraits.every((t) => traits.includes(t))
                : selectedTraits.some((t) => traits.includes(t));
        }
        return true;
    }

    /** Sort result array by name, level or price */
    protected sortResult(result: CompendiumBrowserIndexData[]): CompendiumBrowserIndexData[] {
        if (!this.filterData) return [];
        const order = this.filterData.order;
        const lang = game.i18n.lang;
        const sorted = result.sort((entryA, entryB) => {
            switch (order.by) {
                case "name":
                    return entryA.name.localeCompare(entryB.name, lang);
                case "level":
                    return entryA.level - entryB.level || entryA.name.localeCompare(entryB.name, lang);
                case "price":
                    return entryA.priceInCopper - entryB.priceInCopper || entryA.name.localeCompare(entryB.name, lang);
                case "rank":
                    return entryA.rank - entryB.rank || entryA.name.localeCompare(entryB.name, lang);
                default:
                    return 0;
            }
        });
        return order.direction === "asc" ? sorted : sorted.reverse();
    }

    /** Return new range filter values based on input */
    parseRangeFilterInput(_name: string, lower: string, upper: string): RangesInputData["values"] {
        return {
            min: Number(lower) || 0,
            max: Number(upper) || 0,
            inputMin: lower,
            inputMax: upper,
        };
    }

    /** Check if an array includes any keys of another array */
    protected arrayIncludes(array: string[], other: string[]): boolean {
        return other.some((value) => array.includes(value));
    }

    /** Generates a localized and sorted CheckBoxOptions object from config data */
    protected generateCheckboxOptions(
        configData: Record<string, string | { label: string }>,
        sort = true,
    ): CheckboxOptions {
        // Localize labels for sorting. Return localized and sorted CheckBoxOptions
        const localized = R.mapValues(configData, (v) => game.i18n.localize(R.isObjectType(v) ? v.label : v));
        return Object.entries(sort ? this.sortedConfig(localized) : localized).reduce(
            (result: CheckboxOptions, [key, label]) => ({
                ...result,
                [key]: {
                    label,
                    selected: false,
                },
            }),
            {},
        );
    }

    protected generateMultiselectOptions<T extends string>(
        optionsRecord: Record<T, string>,
        sort?: boolean,
    ): { value: T; label: string }[];
    protected generateMultiselectOptions(
        optionsRecord: Record<string, string>,
        sort = true,
    ): { value: string; label: string }[] {
        const options = Object.entries(optionsRecord).map(([value, label]) => ({
            value,
            label: game.i18n.localize(label),
        }));
        if (sort) {
            options.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
        }

        return options;
    }

    /** Generates a sorted CheckBoxOptions object from a sources Set */
    protected generateSourceCheckboxOptions(sources: Set<string>): CheckboxOptions {
        return [...sources].sort().reduce(
            (result: CheckboxOptions, source) => ({
                ...result,
                [sluggify(source)]: {
                    label: source,
                    selected: false,
                },
            }),
            {},
        );
    }

    /** Provide a best-effort sort of an object (e.g. CONFIG.PF2E.monsterTraits) */
    protected sortedConfig(obj: Record<string, string>): Record<string, string> {
        return Object.fromEntries(
            [...Object.entries(obj)].sort((entryA, entryB) => entryA[1].localeCompare(entryB[1], game.i18n.lang)),
        );
    }

    /** Ensure all index fields are present in the index data */
    protected hasAllIndexFields(data: CompendiumIndexData, indexFields: string[]): boolean {
        for (const field of indexFields) {
            if (fu.getProperty(data, field) === undefined && !/\.(?:source|publication)/.test(field)) {
                return false;
            }
        }
        return true;
    }

    #getRollTableResults({
        initial = 0,
        weight = 1,
    }: {
        initial?: number;
        weight?: number;
    }): Partial<TableResultSource>[] {
        return this.results.map((entry, index): Partial<TableResultSource> => {
            const rangeMinMax = initial + index + 1;
            return {
                type: "document",
                documentUuid: entry.uuid,
                weight,
                range: [rangeMinMax, rangeMinMax],
                drawn: false,
            };
        });
    }

    async createRollTable(): Promise<void> {
        if (!this.isInitialized) {
            throw ErrorPF2e(`Compendium Browser Tab "${this.tabName}" is not initialized!`);
        }

        if (this.results.length > this.#MAX_TABLE_SIZE) {
            ui.notifications.warn(
                game.i18n.format("PF2E.CompendiumBrowser.RollTable.TooManyResults", {
                    size: this.results.length,
                    maxSize: this.#MAX_TABLE_SIZE,
                }),
            );
            return;
        }

        const templatePath = `${SYSTEM_ROOT}/templates/compendium-browser/roll-table-dialog.hbs`;
        const content = await fa.handlebars.renderTemplate(templatePath, { count: this.results.length });
        foundry.applications.api.DialogV2.confirm({
            content,
            window: { title: "PF2E.CompendiumBrowser.RollTable.CreateLabel" },
            yes: {
                callback: (_event, _button, dialog) => {
                    const dialogEl = dialog.element;
                    const name =
                        htmlQuery<HTMLInputElement>(dialogEl, "input[name=name]")?.value ||
                        game.i18n.localize("PF2E.CompendiumBrowser.Title");
                    const weight = Number(htmlQuery<HTMLInputElement>(dialogEl, "input[name=weight]")?.value) || 1;
                    const results = this.#getRollTableResults({ weight });
                    RollTable.create(
                        {
                            name,
                            results,
                            formula: `1d${results.length}`,
                        },
                        { renderSheet: true },
                    );
                },
                default: true,
            },
        });
    }

    async addToRollTable(): Promise<void> {
        if (!this.isInitialized) {
            throw ErrorPF2e(`Compendium Browser Tab "${this.tabName}" is not initialized!`);
        }

        if (this.results.length > this.#MAX_TABLE_SIZE) {
            ui.notifications.warn(
                game.i18n.format("PF2E.CompendiumBrowser.RollTable.TooManyResults", {
                    size: this.results.length,
                    maxSize: this.#MAX_TABLE_SIZE,
                }),
            );
            return;
        }

        const templatePath = `${SYSTEM_ROOT}/templates/compendium-browser/roll-table-dialog.hbs`;
        const content = await fa.handlebars.renderTemplate(templatePath, {
            count: this.results.length,
            rollTables: game.tables.contents,
        });
        fa.api.DialogV2.confirm({
            window: { title: "PF2E.CompendiumBrowser.RollTable.SelectTableTitle" },
            content,
            yes: {
                callback: (_event, _button, dialog) => {
                    const html = dialog.element;
                    const option = htmlQuery<HTMLSelectElement>(html, "select[name=roll-table]")?.selectedOptions[0];
                    if (!option) return;
                    const weight = Number(htmlQuery<HTMLInputElement>(html, "input[name=weight]")?.value) || 1;
                    const table = game.tables.get(option.value, { strict: true });
                    table.createEmbeddedDocuments(
                        "TableResult",
                        this.#getRollTableResults({ initial: table.results.size, weight }),
                    );
                    table?.sheet?.render({ force: true });
                },
            },
        });
    }
}
