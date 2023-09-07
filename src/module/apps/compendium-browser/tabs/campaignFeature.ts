import { sluggify } from "@util";
import { CompendiumBrowser } from "../index.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { CampaignFeatureFilters, CompendiumBrowserIndexData } from "./data.ts";
import { KINGMAKER_CATEGORIES } from "@item/campaign-feature/values.ts";

export class CompendiumBrowserCampaignFeaturesTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "campaignFeature";
    filterData: CampaignFeatureFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/feat.hbs";

    /* MiniSearch */
    override searchFields = ["name"];
    override storeFields = ["type", "name", "img", "uuid", "level", "category", "traits", "source"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading feats");

        const feats: CompendiumBrowserIndexData[] = [];
        const sources: Set<string> = new Set();
        const indexFields = [
            "img",
            "system.actionType.value",
            "system.actions.value",
            "system.category",
            "system.level.value",
            "system.prerequisites.value",
            "system.source.value",
            "system.traits",
        ];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("campaignFeature"),
            indexFields
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const featData of index.filter((i) => i.type === "campaignFeature")) {
                featData.filters = {};

                // Prepare source
                const source = featData.system.source.value;
                const sourceSlug = sluggify(source);
                if (source) {
                    sources.add(source);
                }

                // Only store essential data
                feats.push({
                    type: featData.type,
                    name: featData.name,
                    img: featData.img,
                    uuid: `Compendium.${pack.collection}.${featData._id}`,
                    level: featData.system.level?.value,
                    category: featData.system.category,
                    traits: featData.system.traits.value,
                    rarity: featData.system.traits.rarity,
                    source: sourceSlug,
                });
            }
        }

        // Set indexData
        this.indexData = feats;

        // Filters
        this.filterData.checkboxes.category.options = this.generateCheckboxOptions(KINGMAKER_CATEGORIES);
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);
        this.filterData.multiselects.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.kingmakerTraits);

        console.debug("PF2e System | Compendium Browser | Finished loading feats");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects, sliders } = this.filterData;

        const entryLevel = entry.level ?? 0;

        // Level
        if (!(entryLevel >= sliders.level.values.min && entryLevel <= sliders.level.values.max)) {
            return false;
        }
        // Campaign category type
        if (checkboxes.category.selected.length) {
            if (!checkboxes.category.selected.includes(entry.category)) return false;
        }
        // Traits
        if (!this.filterTraits(entry.traits, multiselects.traits.selected, multiselects.traits.conjunction)) {
            return false;
        }
        // Source
        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        // Rarity
        if (checkboxes.rarity.selected.length) {
            if (!checkboxes.rarity.selected.includes(entry.rarity)) return false;
        }
        return true;
    }

    protected override prepareFilterData(): CampaignFeatureFilters {
        return {
            checkboxes: {
                category: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterCategory",
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
                traits: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterTraits",
                    options: [],
                    selected: [],
                },
            },
            order: {
                by: "level",
                direction: "asc",
                options: {
                    name: "PF2E.BrowserSortyByNameLabel",
                    level: "PF2E.BrowserSortyByLevelLabel",
                },
            },
            sliders: {
                level: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterLevels",
                    values: {
                        lowerLimit: 0,
                        upperLimit: 20,
                        min: 0,
                        max: 20,
                        step: 1,
                    },
                },
            },
            search: {
                text: "",
            },
        };
    }
}
