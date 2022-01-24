import { CompendiumBrowserV2 } from "..";
import { CheckBoxOptions, Filters } from "./data";
import { sluggify } from "@util";
import { TabName } from "../data";

export abstract class CompendiumBrowserTab {
    /** A reference to the parent CompendiumBrowser */
    protected browser: CompendiumBrowserV2;
    /** An unmodified copy of this.filterData */
    protected defaultFilterData!: Filters<"base">;
    /** The full CompendiumIndex of this tab */
    protected indexData: CompendiumIndexData[] = [];
    /** Is this tab initialized? */
    isInitialized = false;
    /** The filter schema for this tab; The tabs filters are rendered based on this.*/
    filterData!: Filters<"base">;
    /** The total count of items in the currently filtered index */
    totalItemCount = 0;
    /** The initial display limit for this tab; Scrolling is currently hardcoded to +100 */
    scrollLimit = 100;
    /** The name of this tab */
    tabName: Exclude<TabName, "settings">;

    constructor(browser: CompendiumBrowserV2, tabName: Exclude<TabName, "settings">) {
        this.browser = browser;
        this.tabName = tabName;
    }

    /** Initialize this this tab */
    async init(): Promise<void> {
        // Load the index and populate filter data
        await this.loadData();
        // Set defaultFilterData for resets
        this.defaultFilterData = duplicate(this.filterData);
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
        this.filterData = duplicate(this.defaultFilterData);
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
        const sorted = result.sort((entryA, entryB) => {
            switch (order.by) {
                case "name":
                    return entryA.name.localeCompare(entryB.name);
                case "level":
                    return entryA.level - entryB.level || entryA.name.localeCompare(entryB.name);
                case "price":
                    return entryA.priceInCopper - entryB.priceInCopper || entryA.name.localeCompare(entryB.name);
                default:
                    return 0;
            }
        });
        return order.direction === "asc" ? sorted : sorted.reverse();
    }

    /** Check if an array includes any keys of another array */
    protected arrayIncludes(array: string[], other: string[]): boolean {
        return other.some((value) => array.includes(value));
    }

    /** Generates a localized and sorted CheckBoxOptions object from config data */
    protected generateCheckboxOptions(configData: Record<string, string>, sort = true): CheckBoxOptions {
        // Localize labels for sorting
        const localized = Object.entries(configData).reduce(
            (result, [key, label]) => ({
                ...result,
                [key]: game.i18n.localize(label),
            }),
            {} as Record<string, string>
        );
        // Return localized and sorted CheckBoxOptions
        return Object.entries(sort ? this.sortedObject<string>(localized) : localized).reduce(
            (result, [key, label]) => ({
                ...result,
                [key]: {
                    label,
                    selected: false,
                },
            }),
            {} as CheckBoxOptions
        );
    }

    /** Generates a sorted CheckBoxOptions object from a sources Set */
    protected generateSourceCheckboxOptions(sources: Set<string>): CheckBoxOptions {
        return [...sources].sort().reduce(
            (result, source) => ({
                ...result,
                [sluggify(source)]: {
                    label: source,
                    selected: false,
                },
            }),
            {} as CheckBoxOptions
        );
    }

    /** Provide a best-effort sort of an object (e.g. CONFIG.PF2E.monsterTraits) */
    protected sortedObject<T = unknown>(obj: Record<string, T>) {
        return Object.fromEntries([...Object.entries(obj)].sort());
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
