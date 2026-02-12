import { KINGMAKER_CATEGORIES } from "@item/campaign-feature/values.ts";
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
    override storeFields = ["name", "originalName", "img", "uuid", "level", "rarity", "options"];

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
                const system = featData.system;

                const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
                const options: string[] = [
                    ...system.traits.value.map((t: string) => `trait:${t.replace(/^hb_/, "")}`),
                    `category:${system.category}`,
                    `level:${system.level?.value ?? 0}`,
                    `rarity:${system.traits.rarity}`,
                    this.preparePublicationSource(pubSource, publications),
                ];

                feats.push({
                    name: featData.name,
                    originalName: featData.originalName, // Added by Babele
                    img: featData.img,
                    uuid: featData.uuid,
                    level: featData.system.level?.value,
                    rarity: system.traits.rarity,
                    options: new Set(options),
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
