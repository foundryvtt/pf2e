import { sluggify } from "@util";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { CompendiumBrowserIndexData, HeritageFilters } from "./data.ts";

export class CompendiumBrowserHeritageTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "heritage";
    filterData: HeritageFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/heritage.hbs";

    override searchFields = ["name", "originalName"];
    override storeFields = ["img", "name", "type", "uuid", "traits", "source", "rarity", "ancestry"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading heritages");

        const heritages: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = ["img", "system.traits", "system.publication", "system.source", "system.ancestry"];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("heritage"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const heritageData of index) {
                if (heritageData.type === "heritage") {
                    heritageData.filters = {};
                }

                const pubSource = heritageData.system.publication?.title ?? heritageData.system.source?.value ?? "";
                const sourceSlug = sluggify(pubSource);
                if (pubSource) publications.add(pubSource);

                heritages.push({
                    type: heritageData.type,
                    name: heritageData.name,
                    originalName: heritageData.originalName,
                    img: heritageData.img,
                    uuid: heritageData.uuid,
                    traits: heritageData.system.traits.value.map((t: string) => t.replace(/^hb_/, "")),
                    rarity: heritageData.system.traits.rarity,
                    source: sourceSlug,
                    ancestry: heritageData.system.ancestry?.slug ?? "versatile",
                });
            }

            // Create a dynamic list of ancestries to use in a filter from the indexed data
            const ancestryOptions = Object.fromEntries(
                heritages.map((t) => {
                    const ancestries = CONFIG.PF2E.ancestryTraits as { [key: string]: string };
                    const ancestryString = Object.keys(CONFIG.PF2E.ancestryTraits).includes(t.ancestry)
                        ? ancestries[t.ancestry]
                        : t.ancestry === "versatile"
                          ? "PF2E.Item.Heritage.NoneVersatile"
                          : t.ancestry.replaceAll("-", " ").titleCase();
                    return [t.ancestry, ancestryString];
                }),
            );

            this.indexData = heritages;

            this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(publications);
            this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits);
            this.filterData.multiselects.ancestry.options = this.generateMultiselectOptions(ancestryOptions);
            this.filterData.multiselects.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.ancestryTraits);

            console.debug("PF2e System | Compendium Browser | Finished loading heritages");
        }
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects } = this.filterData;

        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        if (checkboxes.rarity.selected.length) {
            if (!checkboxes.rarity.selected.includes(entry.rarity)) return false;
        }

        if (!this.filterTraits(entry.ancestry, multiselects.ancestry.selected, multiselects.ancestry.conjunction))
            return false;
        if (!this.filterTraits(entry.traits, multiselects.traits.selected, multiselects.traits.conjunction))
            return false;

        return true;
    }

    protected override prepareFilterData(): HeritageFilters {
        return {
            checkboxes: {
                rarity: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterRarities",
                    options: {},
                    selected: [],
                },
                source: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSource",
                    options: {},
                    selected: [],
                },
            },

            multiselects: {
                ancestry: {
                    conjunction: "or",
                    label: "PF2E.BrowserFilterAncestries",
                    options: [],
                    selected: [],
                },
                traits: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterTraits",
                    options: [],
                    selected: [],
                },
            },

            order: {
                by: "name",
                direction: "asc",
                options: {
                    name: "Name",
                },
            },
            search: {
                text: "",
            },
        };
    }
}
