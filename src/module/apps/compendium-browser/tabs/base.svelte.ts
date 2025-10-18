import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import type { TableResultSource } from "@common/documents/table-result.d.mts";
import { CompendiumDirectoryPF2e } from "@module/apps/sidebar/compendium-directory.ts";
import { CachedPredicate, type PredicateStatement } from "@system/predication.ts";
import { ErrorPF2e, htmlQuery, sluggify } from "@util";
import MiniSearch from "minisearch";
import * as R from "remeda";
import { CompendiumBrowser, CompendiumBrowserOpenTabOptions } from "../browser.ts";
import { BrowserTabs, ContentTabName } from "../data.ts";
import type {
    BrowserFilter,
    CheckboxData,
    ChipsData,
    CompendiumBrowserIndexData,
    LabeledValue,
    RangesInputData,
} from "./data.ts";

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
        const baseResults = this.sortResult(searchText ? this.searchEngine.search(searchText) : this.indexData);
        const predicate = this.buildPredicate();
        return baseResults.filter((i) => predicate.test(i.domains));
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

    /** Build a `CachedPredicate` from the applied filters */
    protected buildPredicate(): CachedPredicate {
        if (!this.filterData) {
            throw ErrorPF2e(`Tab "${this.tabLabel}" is not initialized!`);
        }
        const statements: PredicateStatement[] = [];

        if ("checkboxes" in this.filterData) {
            const checkboxes = this.filterData.checkboxes as Record<string, CheckboxData>;
            for (const [key, checkbox] of R.entries(checkboxes)) {
                if (checkbox.selected.length === 0) continue;
                const prefix = checkbox.optionPrefix ?? key;
                statements.push({ and: checkbox.selected.map((s) => `${prefix}:${s}`) });
            }
        }

        if ("chips" in this.filterData) {
            const chipsFilters = this.filterData.chips as Record<string, ChipsData>;
            for (const [key, chips] of R.entries(chipsFilters)) {
                const conjunction = chips.conjunction;
                if (chips.selected.length === 0) continue;
                const prefix = chips.optionPrefix ?? key;
                const include = chips.selected.filter((s) => !s.exclude).map((s) => `${prefix}:${s.value}`);
                if (include.length > 0) {
                    const statement = { [conjunction]: include } as PredicateStatement;
                    statements.push(statement);
                }
                const exclude: string[] = chips.selected.filter((s) => s.exclude).map((s) => `${prefix}:${s.value}`);
                if (exclude.length > 0) {
                    statements.push({ not: { or: exclude } });
                }
            }
        }

        if ("level" in this.filterData) {
            const level = this.filterData.level;
            if (level.from !== level.min || level.to !== level.max) {
                statements.push({ and: [{ gte: ["level", level.from] }, { lte: ["level", level.to] }] });
            }
        }

        if ("ranges" in this.filterData) {
            const ranges = this.filterData.ranges;
            for (const [key, range] of R.entries(ranges)) {
                if (!range.changed) continue;
                const prefix = range.optionPrefix ?? key;
                const min = range.values.min;
                const max = range.values.max;
                statements.push({ and: [{ gte: [prefix, min] }, { lte: [prefix, max] }] });
            }
        }

        if ("selects" in this.filterData) {
            const selects = this.filterData.selects;
            for (const [key, select] of R.entries(selects)) {
                if (!select.selected) continue;
                const prefix = select.optionPrefix ?? key;
                statements.push(`${prefix}:${select.selected}`);
            }
        }

        if ("source" in this.filterData) {
            const source = this.filterData.source;
            if (source.selected.length > 0) {
                statements.push({ or: source.selected });
            }
        }

        const traits = this.filterData.traits;
        if (traits.selected.length > 0) {
            const include = traits.selected.filter((t) => !t.not).map((t) => `trait:${t.value}`);
            if (include.length > 0) {
                const includeStatement = { [traits.conjunction]: include } as PredicateStatement;
                statements.push(includeStatement);
            }
            const exclude = traits.selected.filter((t) => t.not).map((t) => `trait:${t.value}`);
            if (exclude.length > 0) {
                statements.push({ not: { or: exclude } });
            }
        }

        return new CachedPredicate([{ and: statements }]);
    }

    /** Sort result array by name, level or price */
    protected sortResult(result: CompendiumBrowserIndexData[]): CompendiumBrowserIndexData[] {
        if (!this.filterData) return result;
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

    /** Generates a localized and sorted options from config data
     * @param configData The object to convert to options
     * @param [options] Additional options for the conversion
     * @param [options.prefix] An additional prefix for these options. The final value will be `filterPrefix:thisPrefix:option`
     * @param [options.sort] Wether to sort the resulting options alphabetically
     */
    protected generateOptions<T extends string>(
        configData: Record<T, string | { label: string }>,
        options?: { prefix?: string; sort?: boolean },
    ): LabeledValue<T>[];
    protected generateOptions(
        configData: Record<string, string | { label: string }>,
        { prefix, sort }: { prefix?: string; sort?: boolean } = { sort: true },
    ): LabeledValue[] {
        // Localize labels for sorting. Return localized and sorted CheckBoxOptions
        const locale = game.i18n.lang;
        const localized = R.mapValues(configData, (v) => game.i18n.localize(R.isPlainObject(v) ? v.label : v));
        const options: LabeledValue[] = R.entries(localized).map(([value, label]) => ({
            label,
            value: prefix ? `${prefix}:${value}` : value,
        }));
        if (sort) options.sort((a, b) => a.label.localeCompare(b.label, locale));
        return options;
    }

    protected generateMultiselectOptions<T extends string>(
        optionsRecord: Record<T, string>,
        options?: { prefix?: string; sort?: boolean },
    ): LabeledValue<T>[];
    protected generateMultiselectOptions(
        optionsRecord: Record<string, string>,
        { prefix, sort }: { prefix?: string; sort?: boolean } = { sort: true },
    ): LabeledValue[] {
        const options = Object.entries(optionsRecord).map(([value, label]) => ({
            label: game.i18n.localize(label),
            value: prefix ? `${prefix}:${value}` : value,
        }));
        if (sort) options.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
        return options;
    }

    /** Generates a sorted CheckBoxOptions object from a sources Set */
    protected generateSourceCheckboxOptions(sources: Set<string>): LabeledValue[] {
        const locale = game.i18n.lang;
        const sorted = [...sources].sort(([a, b]) => a.localeCompare(b, locale));
        return sorted.map((s) => ({ label: s, value: `source:${sluggify(s)}` }));
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

        const templatePath = "systems/pf2e/templates/compendium-browser/roll-table-dialog.hbs";
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

        const templatePath = "systems/pf2e/templates/compendium-browser/roll-table-dialog.hbs";
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
