import { sluggify } from "@util";
import { CompendiumBrowser } from "../browser.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.svelte.ts";
import { CompendiumBrowserIndexData, HazardFilters } from "./data.ts";

export class CompendiumBrowserHazardTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "hazard";
    tabLabel = "PF2E.CompendiumBrowser.TabHazard";
    declare filterData: HazardFilters;

    /* MiniSearch */
    override searchFields = ["name", "originalName"];
    override storeFields = ["name", "originalName", "img", "uuid", "level", "rarity", "domains"];

    protected index = ["img", "system.details.level.value", "system.details.isComplex", "system.traits"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    override get isGMOnly(): boolean {
        return true;
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading Hazard actors");

        const hazardActors: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [...this.index, "system.details.publication", "system.details.source"];

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
                const domains = new Set<string>();
                const system = actorData.system;

                for (const trait of system.traits.value) {
                    domains.add(`trait:${trait}`);
                }

                // Prepare publication source
                const details = system.details;
                const pubSource = String(details.publication?.title ?? details.source?.value ?? "").trim();
                const sourceSlug = sluggify(pubSource);
                if (pubSource) {
                    publications.add(pubSource);
                    domains.add(`source:${sourceSlug}`);
                }

                domains.add(`complexity:${system.details.isComplex ? "complex" : "simple"}`);
                domains.add(`level:${system.details.level.value}`);
                domains.add(`rarity:${system.traits.rarity}`);
                domains.add(`type:${actorData.type}`);

                hazardActors.push({
                    name: actorData.name,
                    originalName: actorData.originalName, // Added by Babele
                    img: actorData.img,
                    uuid: actorData.uuid,
                    level: actorData.system.details.level.value,
                    rarity: actorData.system.traits.rarity,
                    domains,
                });
            }
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loaded`);
        }

        // Set indexData
        this.indexData = hazardActors;

        // Filters
        this.filterData.chips.complexity.options = this.generateOptions(
            {
                simple: "PF2E.Actor.Hazard.Simple",
                complex: "PF2E.TraitComplex",
            },
            { sort: false },
        );
        this.filterData.chips.rarity.options = this.generateOptions(CONFIG.PF2E.rarityTraits, { sort: false });
        this.filterData.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.hazardTraits);
        this.filterData.source.options = this.generateSourceCheckboxOptions(publications);

        console.debug("PF2e System | Compendium Browser | Finished loading Hazard actors");
    }

    protected override prepareFilterData(): HazardFilters {
        return {
            chips: {
                complexity: {
                    conjunction: "or",
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.Complexity",
                    options: [],
                    selected: [],
                },
                rarity: {
                    conjunction: "or",
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.Rarities",
                    options: [],
                    selected: [],
                },
            },
            source: {
                isExpanded: false,
                label: "PF2E.CompendiumBrowser.Filter.Source",
                options: [],
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
                min: -1,
                max: 25,
                from: -1,
                to: 25,
            },
            search: {
                text: "",
            },
        };
    }
}
