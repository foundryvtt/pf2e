import { sluggify } from "@util";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { AncestryFilters, CompendiumBrowserIndexData } from "./data.ts";

export class CompendiumBrowserAncestryTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "ancestry";
    filterData: AncestryFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/ancestry.hbs";

    /* MiniSearch */
    override searchFields = ["name", "originalName"];
    override storeFields = ["type", "name", "img", "uuid", "traits", "source", "rarity", "boosts", "hitpoints"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading ancestries");

        const ancestries: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [
            "img",
            "system.traits",
            "system.publication",
            "system.source",
            "system.boosts",
            "system.hp",
        ];
        const ancestryHitpoints = { 6: "6", 8: "8", 10: "10" };

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("ancestry"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const ancestryData of index) {
                if (ancestryData.type === "ancestry") {
                    ancestryData.filters = {};
                }

                const pubSource = ancestryData.system.publication?.title ?? ancestryData.system.source?.value ?? "";
                const sourceSlug = sluggify(pubSource);
                if (pubSource) publications.add(pubSource);

                ancestries.push({
                    type: ancestryData.type,
                    name: ancestryData.name,
                    originalName: ancestryData.originalName,
                    boosts: Object.keys(ancestryData.system.boosts)
                        .flatMap((t: string) => {
                            return ancestryData.system.boosts[t].value.length == 1
                                ? ancestryData.system.boosts[t].value
                                : null;
                        })
                        .filter(String),
                    hitpoints: ancestryData.system.hp.toString(),
                    img: ancestryData.img,
                    uuid: ancestryData.uuid,
                    rarity: ancestryData.system.traits.rarity,
                    source: sourceSlug,
                });
            }

            this.indexData = ancestries;

            this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(publications);
            this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits);
            this.filterData.multiselects.boosts.options = this.generateMultiselectOptions(CONFIG.PF2E.abilities);
            this.filterData.checkboxes.hitpoints.options = this.generateCheckboxOptions(ancestryHitpoints);
            console.debug("PF2e System | Compendium Browser | Finished loading ancestries");
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
        if (checkboxes.hitpoints.selected.length) {
            if (!checkboxes.hitpoints.selected.includes(entry.hitpoints)) return false;
        }

        if (!this.filterTraits(entry.boosts, multiselects.boosts.selected, multiselects.boosts.conjunction))
            return false;

        return true;
    }

    protected override prepareFilterData(): AncestryFilters {
        return {
            checkboxes: {
                hitpoints: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterHitPoints",
                    options: {},
                    selected: [],
                },
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
                boosts: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterBoosts",
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
