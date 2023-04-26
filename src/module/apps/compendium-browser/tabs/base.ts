import { ErrorPF2e, sluggify } from "@util";
import MiniSearch from "minisearch";
import { BrowserTabs, ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { BrowserFilter, CheckboxOptions, CompendiumBrowserIndexData, MultiselectData, RangesData } from "./data.ts";

export abstract class CompendiumBrowserTab {
    /** A reference to the parent CompendiumBrowser */
    protected browser: CompendiumBrowser;
    /** The filter schema for this tab; The tabs filters are rendered based on this.*/
    abstract filterData: BrowserFilter;
    /** An unmodified copy of this.filterData */
    declare defaultFilterData: this["filterData"];
    /** The full CompendiumIndex of this tab */
    protected indexData: CompendiumBrowserIndexData[] = [];
    /** Is this tab initialized? */
    isInitialized = false;
    /** The total count of items in the currently filtered index */
    totalItemCount = 0;
    /** The initial display limit for this tab; Scrolling is currently hardcoded to +100 */
    scrollLimit = 100;
    /** The name of this tab */
    abstract tabName: ContentTabName;
    /** A DOMParser instance */
    #domParser = new DOMParser();
    /** The path to the result list template of this tab */
    abstract templatePath: string;
    /** Minisearch */
    declare searchEngine: MiniSearch;
    /** Names of the document fields to be indexed. */
    searchFields: string[] = [];
    /** Names of fields to store, so that search results would include them.
     *  By default none, so resuts would only contain the id field. */
    storeFields: string[] = [];

    constructor(browser: CompendiumBrowser) {
        this.browser = browser;
    }

    /** Initialize this this tab */
    async init(): Promise<void> {
        // Load the index and populate filter data
        await this.loadData();
        // Initialize MiniSearch
        this.searchEngine = new MiniSearch({
            fields: this.searchFields,
            idField: "uuid",
            storeFields: this.storeFields,
            searchOptions: { combineWith: "AND", prefix: true },
        });
        this.searchEngine.addAll(this.indexData);
        // Set defaultFilterData for resets
        this.defaultFilterData = deepClone(this.filterData);
        // Initialization complete
        this.isInitialized = true;
    }

    /** Open this tab
     * @param filter An optional initial filter for this tab
     */
    async open(filter?: BrowserFilter): Promise<void> {
        if (filter) {
            if (!this.isInitialized) {
                throw ErrorPF2e(`Tried to pass an initial filter to uninitialized tab "${this.tabName}"`);
            }
            this.filterData = filter;
        }
        await this.browser.loadTab(this.tabName);
    }

    /** Filter indexData and return slice based on current scrollLimit */
    getIndexData(start: number): CompendiumBrowserIndexData[] {
        if (!this.isInitialized) {
            throw ErrorPF2e(`Compendium Browser Tab "${this.tabName}" is not initialized!`);
        }

        const currentIndex = (() => {
            const searchText = this.filterData.search.text;
            if (searchText) {
                const searchResult = this.searchEngine.search(searchText) as CompendiumBrowserIndexData[];
                return this.sortResult(searchResult.filter(this.filterIndexData.bind(this)));
            }
            return this.sortResult(this.indexData.filter(this.filterIndexData.bind(this)));
        })();
        this.totalItemCount = currentIndex.length;
        return currentIndex.slice(start, this.scrollLimit);
    }

    /** Returns a clean copy of the filterData for this tab. Initializes the tab if necessary. */
    async getFilterData(): Promise<this["filterData"]> {
        if (!this.isInitialized) {
            await this.init();
        }
        return deepClone(this.defaultFilterData);
    }

    /** Reset all filters */
    resetFilters(): void {
        this.filterData = deepClone(this.defaultFilterData);
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
    protected filterIndexData(_entry: CompendiumBrowserIndexData): boolean {
        return true;
    }

    protected filterTraits(
        traits: string[],
        selected: MultiselectData["selected"],
        condition: MultiselectData["conjunction"]
    ): boolean {
        const selectedTraits = selected.filter((s) => !s.not).map((s) => s.value);
        const notTraits = selected.filter((t) => t.not).map((s) => s.value);
        if (selectedTraits.length || notTraits.length) {
            if (notTraits.some((t) => traits.includes(t))) {
                return false;
            }
            const fullfilled =
                condition === "and"
                    ? selectedTraits.every((t) => traits.includes(t))
                    : selectedTraits.some((t) => traits.includes(t));
            if (!fullfilled) return false;
        }
        return true;
    }

    async renderResults(start: number): Promise<HTMLLIElement[]> {
        if (!this.templatePath) {
            throw ErrorPF2e(`Tab "${this.tabName}" has no valid template path.`);
        }
        const indexData = this.getIndexData(start);
        const liElements: HTMLLIElement[] = [];
        for (const entry of indexData) {
            const htmlString = await renderTemplate(this.templatePath, {
                entry,
                filterData: this.filterData,
            });
            const html = this.#domParser.parseFromString(htmlString, "text/html");
            liElements.push(html.body.firstElementChild as HTMLLIElement);
        }
        return liElements;
    }

    /** Sort result array by name, level or price */
    protected sortResult(result: CompendiumBrowserIndexData[]): CompendiumBrowserIndexData[] {
        const { order } = this.filterData;
        const lang = game.i18n.lang;
        const sorted = result.sort((entryA, entryB) => {
            switch (order.by) {
                case "name":
                    return entryA.name.localeCompare(entryB.name, lang);
                case "level":
                    return entryA.level - entryB.level || entryA.name.localeCompare(entryB.name, lang);
                case "price":
                    return entryA.priceInCopper - entryB.priceInCopper || entryA.name.localeCompare(entryB.name, lang);
                default:
                    return 0;
            }
        });
        return order.direction === "asc" ? sorted : sorted.reverse();
    }

    /** Return new range filter values based on input */
    parseRangeFilterInput(_name: string, lower: string, upper: string): RangesData["values"] {
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
    protected generateCheckboxOptions(configData: Record<string, string>, sort = true): CheckboxOptions {
        // Localize labels for sorting
        const localized = Object.entries(configData).reduce(
            (result, [key, label]) => ({
                ...result,
                [key]: game.i18n.localize(label),
            }),
            {} as Record<string, string>
        );
        // Return localized and sorted CheckBoxOptions
        return Object.entries(sort ? this.sortedConfig(localized) : localized).reduce(
            (result, [key, label]) => ({
                ...result,
                [key]: {
                    label,
                    selected: false,
                },
            }),
            {} as CheckboxOptions
        );
    }

    protected generateMultiselectOptions<T extends string>(
        optionsRecord: Record<T, string>,
        sort?: boolean
    ): { value: T; label: string }[];
    protected generateMultiselectOptions(
        optionsRecord: Record<string, string>,
        sort = true
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
            (result, source) => ({
                ...result,
                [sluggify(source)]: {
                    label: source,
                    selected: false,
                },
            }),
            {} as CheckboxOptions
        );
    }

    /** Provide a best-effort sort of an object (e.g. CONFIG.PF2E.monsterTraits) */
    protected sortedConfig(obj: Record<string, string>): Record<string, string> {
        return Object.fromEntries(
            [...Object.entries(obj)].sort((entryA, entryB) => entryA[1].localeCompare(entryB[1], game.i18n.lang))
        );
    }

    /** Ensure all index fields are present in the index data */
    protected hasAllIndexFields(data: CompendiumIndexData, indexFields: string[]): boolean {
        for (const field of indexFields) {
            if (getProperty(data, field) === undefined) {
                return false;
            }
        }
        return true;
    }
}
