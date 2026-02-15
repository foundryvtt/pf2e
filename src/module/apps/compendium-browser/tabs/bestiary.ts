import { CompendiumBrowser } from "../browser.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.svelte.ts";
import { BestiaryFilters, CompendiumBrowserIndexData } from "./data.ts";

export class CompendiumBrowserBestiaryTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "bestiary";
    tabLabel = "PF2E.CompendiumBrowser.TabBestiary";
    declare filterData: BestiaryFilters;

    protected index = [
        "img",
        "system.details.level.value",
        "system.details.publication.title",
        "system.details.source.value",
        "system.traits",
    ];

    /* MiniSearch */
    override searchFields = ["name", "originalName"];
    override storeFields = ["name", "originalName", "img", "uuid", "level", "rarity", "options"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    override get isGMOnly(): boolean {
        return true;
    }

    protected override async loadData(): Promise<void> {
        const bestiaryActors: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [...this.index];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Actor",
            this.browser.loadedPacks("bestiary"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const actorData of index.filter((d) => d.type === "npc")) {
                if (!this.hasAllIndexFields(actorData, this.index)) {
                    console.warn(
                        `Actor '${actorData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`,
                    );
                    continue;
                }

                const system = actorData.system;
                const details = system.details;
                const pubSource = String(details.publication?.title ?? details.source?.value ?? "").trim();
                const options: string[] = [
                    ...system.traits.value.map((t: string) => `trait:${t.replace(/^hb_/, "")}`),
                    `level:${system.details.level.value}`,
                    `rarity:${system.traits.rarity}`,
                    `size:${system.traits.size.value}`,
                    `type:${actorData.type}`,
                    this.preparePublicationSource(pubSource, publications),
                ];

                bestiaryActors.push({
                    name: actorData.name,
                    originalName: actorData.originalName, // Added by Babele
                    img: actorData.img,
                    uuid: actorData.uuid,
                    level: actorData.system.details.level.value,
                    rarity: actorData.system.traits.rarity,
                    options: new Set(options),
                });
            }
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loaded`);
        }

        // Set indexData
        this.indexData = bestiaryActors;

        // Filters
        this.filterData.checkboxes.sizes.options = this.generateCheckboxOptions(CONFIG.PF2E.actorSizes);
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, {
            sort: false,
        });
        this.filterData.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.creatureTraits);
        this.filterData.source.options = this.generateSourceCheckboxOptions(publications);

        console.debug("PF2e System | Compendium Browser | Finished loading Bestiary actors");
    }

    protected override prepareFilterData(): BestiaryFilters {
        return {
            checkboxes: {
                sizes: {
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.Sizes",
                    options: {},
                    optionPrefix: "size",
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
