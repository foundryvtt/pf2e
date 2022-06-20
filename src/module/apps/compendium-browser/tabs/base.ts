import { CompendiumBrowser } from "..";
import { BaseFilterData, CheckboxOptions, RangesData } from "./data";
import { sluggify } from "@util";
import { TabName } from "../data";

export abstract class CompendiumBrowserTab {
    /** A reference to the parent CompendiumBrowser */
    protected browser: CompendiumBrowser;
    /** An unmodified copy of this.filterData */
    defaultFilterData!: BaseFilterData;
    /** The full CompendiumIndex of this tab */
    protected indexData: CompendiumIndexData[] = [];
    /** Is this tab initialized? */
    isInitialized = false;
    /** The filter schema for this tab; The tabs filters are rendered based on this.*/
    filterData!: BaseFilterData;
    /** The total count of items in the currently filtered index */
    totalItemCount = 0;
    /** The initial display limit for this tab; Scrolling is currently hardcoded to +100 */
    scrollLimit = 100;
    /** The name of this tab */
    tabName: Exclude<TabName, "settings">;

    constructor(browser: CompendiumBrowser, tabName: Exclude<TabName, "settings">) {
        this.browser = browser;
        this.tabName = tabName;
    }

    /** Initialize this this tab */
    async init(): Promise<void> {
        // Load the index and populate filter data
        await this.loadData();
        // Set defaultFilterData for resets
        this.defaultFilterData = deepClone(this.filterData);
        // Initialization complete
        this.isInitialized = true;
    }

    /** Filter indexData and return slice based on current scrollLimit */
    getIndexData(): CompendiumIndexData[] {
        const currentIndex = this.sortResult(this.indexData.filter(this.filterIndexData.bind(this)));
        this.totalItemCount = currentIndex.length;
        return currentIndex.slice(0, this.scrollLimit);
    }

    /** Reset all filters */
    resetFilters(): void {
        const { search } = this.filterData;
        this.filterData = mergeObject(this.defaultFilterData, { search }, { inplace: false });
    }

    /** Load and prepare the compendium index and set filter options */
    protected async loadData(): Promise<void> {}

    /** Prepare the the filterData object of this tab */
    protected prepareFilterData(): void {}

    /** Filter indexData */
    protected filterIndexData(_entry: CompendiumIndexData): boolean {
        return true;
    }

    /** Sort result array by name, level or price */
    protected sortResult(result: CompendiumIndexData[]): CompendiumIndexData[] {
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
    protected sortedConfig(obj: Record<string, string>) {
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
