import { sluggify } from "@util";
import { CompendiumBrowser } from "..";
import { CompendiumBrowserTab } from "./base";
import { BestiaryFilters, CompendiumBrowserIndexData } from "./data";

export class CompendiumBrowserBestiaryTab extends CompendiumBrowserTab {
    protected index = [
        "img",
        "system.details.level.value",
        "system.details.alignment.value",
        "system.details.source.value",
        "system.traits",
    ];

    override filterData!: BestiaryFilters;
    override templatePath = "systems/pf2e/templates/compendium-browser/partials/bestiary.hbs";
    /* MiniSearch */
    override searchFields = ["name"];
    override storeFields = [
        "type",
        "name",
        "img",
        "uuid",
        "level",
        "alignment",
        "actorSize",
        "traits",
        "rarity",
        "source",
    ];

    constructor(browser: CompendiumBrowser) {
        super(browser, "bestiary");

        // Set the filterData object of this tab
        this.prepareFilterData();
    }

    protected override async loadData() {
        console.debug("PF2e System | Compendium Browser | Started loading Bestiary actors");

        const bestiaryActors: CompendiumBrowserIndexData[] = [];
        const sources: Set<string> = new Set();
        const indexFields = [...this.index, "system.details.isComplex"];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Actor",
            this.browser.loadedPacks("bestiary"),
            indexFields
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const actorData of index) {
                if (actorData.type === "npc") {
                    if (!this.hasAllIndexFields(actorData, this.index)) {
                        console.warn(
                            `Actor '${actorData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    // Prepare source
                    const source = actorData.system.details.source.value;
                    if (source) {
                        sources.add(source);
                        actorData.system.details.source.value = sluggify(source);
                    }

                    bestiaryActors.push({
                        type: actorData.type,
                        name: actorData.name,
                        img: actorData.img,
                        uuid: `Compendium.${pack.collection}.${actorData._id}`,
                        level: actorData.system.details.level.value,
                        alignment: actorData.system.details.alignment.value,
                        actorSize: actorData.system.traits.size.value,
                        traits: actorData.system.traits.value,
                        rarity: actorData.system.traits.rarity,
                        source: actorData.system.details.source.value,
                    });
                }
            }
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loaded`);
        }

        // Set indexData
        this.indexData = bestiaryActors;

        // Filters
        this.filterData.checkboxes.sizes.options = this.generateCheckboxOptions(CONFIG.PF2E.actorSizes);
        this.filterData.checkboxes.alignments.options = this.generateCheckboxOptions(CONFIG.PF2E.alignments, false);
        this.filterData.checkboxes.traits.options = this.generateCheckboxOptions(CONFIG.PF2E.monsterTraits);
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, false);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

        console.debug("PF2e System | Compendium Browser | Finished loading Bestiary actors");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, sliders } = this.filterData;

        // Level
        if (!(entry.level >= sliders.level.values.min && entry.level <= sliders.level.values.max)) return false;
        // Size
        if (checkboxes.sizes.selected.length) {
            if (!checkboxes.sizes.selected.includes(entry.actorSize)) return false;
        }
        // Alignment
        if (checkboxes.alignments.selected.length) {
            if (!checkboxes.alignments.selected.includes(entry.alignment)) return false;
        }
        // Traits
        if (checkboxes.traits.selected.length) {
            if (!this.arrayIncludes(checkboxes.traits.selected, entry.traits)) return false;
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

    protected override prepareFilterData(): void {
        this.filterData = {
            checkboxes: {
                sizes: {
                    isExpanded: true,
                    label: "PF2E.BrowserFilterSizes",
                    options: {},
                    selected: [],
                },
                alignments: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterAlignments",
                    options: {},
                    selected: [],
                },
                traits: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterTraits",
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
