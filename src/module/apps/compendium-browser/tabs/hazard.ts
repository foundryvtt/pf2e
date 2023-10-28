import { sluggify } from "@util";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { CompendiumBrowserIndexData, HazardFilters } from "./data.ts";

export class CompendiumBrowserHazardTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "hazard";
    filterData: HazardFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/hazard.hbs";

    /* MiniSearch */
    override searchFields = ["name"];
    override storeFields = ["type", "name", "img", "uuid", "level", "complexity", "traits", "rarity", "source"];

    protected index = ["img", "system.details.level.value", "system.details.isComplex", "system.traits"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading Hazard actors");

        const hazardActors: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [
            ...this.index,
            "system.details.alignment.value",
            "system.details.publication",
            "system.details.source",
        ];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Actor",
            this.browser.loadedPacks("hazard"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const actorData of index.filter((d) => d.type === "hazard")) {
                if (!this.hasAllIndexFields(actorData, this.index)) {
                    console.warn(
                        `Hazard '${actorData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`,
                    );
                    continue;
                }

                // Prepare publication source
                const { details } = actorData.system;
                const pubSource = String(details.publication?.title ?? details.source?.value ?? "").trim();
                const sourceSlug = sluggify(pubSource);
                if (pubSource) publications.add(pubSource);

                hazardActors.push({
                    type: actorData.type,
                    name: actorData.name,
                    img: actorData.img,
                    uuid: `Compendium.${pack.collection}.${actorData._id}`,
                    level: actorData.system.details.level.value,
                    complexity: actorData.system.details.isComplex ? "complex" : "simple",
                    traits: actorData.system.traits.value,
                    rarity: actorData.system.traits.rarity,
                    source: sourceSlug,
                });
            }
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loaded`);
        }

        // Set indexData
        this.indexData = hazardActors;

        // Filters
        this.filterData.checkboxes.complexity.options = this.generateCheckboxOptions(
            {
                simple: "PF2E.Actor.Hazard.Simple",
                complex: "PF2E.TraitComplex",
            },
            false,
        );
        this.filterData.multiselects.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.hazardTraits);
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, false);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(publications);

        console.debug("PF2e System | Compendium Browser | Finished loading Hazard actors");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects, sliders } = this.filterData;

        // Level
        if (!(entry.level >= sliders.level.values.min && entry.level <= sliders.level.values.max)) return false;
        // Complexity
        if (checkboxes.complexity.selected.length) {
            if (!checkboxes.complexity.selected.includes(entry.complexity)) return false;
        }
        // Traits
        if (!this.filterTraits(entry.traits, multiselects.traits.selected, multiselects.traits.conjunction))
            return false;
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

    protected override prepareFilterData(): HazardFilters {
        return {
            checkboxes: {
                complexity: {
                    isExpanded: true,
                    label: "PF2E.BrowserFilterComplexity",
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
                        lowerLimit: -1,
                        upperLimit: 25,
                        min: -1,
                        max: 25,
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
