import { KINGMAKER_CATEGORIES } from "@item/campaign-feature/values.ts";
import { sluggify } from "@util";
import { CompendiumBrowser } from "../browser.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.svelte.ts";
import { CampaignFeatureFilters, CompendiumBrowserIndexData } from "./data.ts";

export class CompendiumBrowserCampaignFeaturesTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "campaignFeature";
    tabLabel = "PF2E.CompendiumBrowser.TabCampaign";
    declare filterData: CampaignFeatureFilters;

    /* MiniSearch */
    override searchFields = ["name", "originalName"];
    override storeFields = ["type", "name", "img", "uuid", "level", "category", "traits", "source"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading feats");

        const feats: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [
            "img",
            "system.actionType.value",
            "system.actions.value",
            "system.category",
            "system.level.value",
            "system.prerequisites.value",
            "system.traits",
            "system.publication",
            "system.source",
        ];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("campaignFeature"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const featData of index.filter((i) => i.type === "campaignFeature")) {
                featData.filters = {};

                // Prepare publication source
                const { system } = featData;
                const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
                const sourceSlug = sluggify(pubSource);
                if (pubSource) publications.add(pubSource);

                // Only store essential data
                feats.push({
                    type: featData.type,
                    name: featData.name,
                    originalName: featData.originalName, // Added by Babele
                    img: featData.img,
                    uuid: featData.uuid,
                    level: featData.system.level?.value,
                    category: featData.system.category,
                    traits: featData.system.traits.value.map((t: string) => t.replace(/^hb_/, "")),
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
        this.filterData.source.options = this.generateSourceCheckboxOptions(publications);
        this.filterData.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.kingmakerTraits);

        console.debug("PF2e System | Compendium Browser | Finished loading feats");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, source, traits, level } = this.filterData;

        const entryLevel = entry.level ?? 0;

        // Level
        if (!(entryLevel >= level.from && entryLevel <= level.to)) {
            return false;
        }
        // Campaign category type
        if (checkboxes.category.selected.length) {
            if (!checkboxes.category.selected.includes(entry.category)) return false;
        }
        // Traits
        if (!this.filterTraits(entry.traits, traits.selected, traits.conjunction)) {
            return false;
        }
        // Source
        if (source.selected.length) {
            if (!source.selected.includes(entry.source)) return false;
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
                    label: "PF2E.CompendiumBrowser.Filter.Categories",
                    options: {},
                    selected: [],
                },
                rarity: {
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.Rarities",
                    options: {},
                    selected: [],
                },
            },
            source: {
                isExpanded: false,
                label: "PF2E.CompendiumBrowser.Filter.Source",
                options: {},
                selected: [],
            },
            traits: {
                conjunction: "and",
                options: [],
                selected: [],
            },
            order: {
                by: "level",
                direction: "asc",
                options: {
                    name: { label: "Name", type: "alpha" },
                    level: { label: "PF2E.LevelLabel", type: "numeric" },
                },
                type: "numeric",
            },
            level: {
                changed: false,
                isExpanded: false,
                min: 0,
                max: 20,
                from: 0,
                to: 20,
            },
            search: {
                text: "",
            },
        };
    }
}
