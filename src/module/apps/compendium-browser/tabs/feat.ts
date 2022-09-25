import { sluggify } from "@util";
import { CompendiumBrowser } from "..";
import { CompendiumBrowserTab } from "./base";
import { CompendiumBrowserIndexData, FeatFilters } from "./data";

export class CompendiumBrowserFeatTab extends CompendiumBrowserTab {
    override filterData!: FeatFilters;
    override templatePath = "systems/pf2e/templates/compendium-browser/partials/feat.html";
    /* MiniSearch */
    override searchFields = ["name"];
    override storeFields = ["type", "name", "img", "uuid", "level", "featType", "skills", "traits", "rarity", "source"];

    constructor(browser: CompendiumBrowser) {
        super(browser, "feat");

        // Set the filterData object of this tab
        this.prepareFilterData();
    }

    protected override async loadData() {
        console.debug("PF2e System | Compendium Browser | Started loading feats");

        const feats: CompendiumBrowserIndexData[] = [];
        const skills: Set<string> = new Set();
        const sources: Set<string> = new Set();
        const indexFields = [
            "img",
            "system.prerequisites.value",
            "system.actionType.value",
            "system.actions.value",
            "system.featType.value",
            "system.level.value",
            "system.traits",
            "system.source.value",
        ];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("feat"),
            indexFields
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const featData of index) {
                if (featData.type === "feat") {
                    featData.filters = {};
                    if (!this.hasAllIndexFields(featData, indexFields)) {
                        console.warn(
                            `Feat '${featData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    featData.system.skills = { value: [] };

                    // determine skill prerequisites
                    // Note: This code includes some feats, where the prerequisite has the name of a skill.
                    // I decided to include them. The code would not be worth it, to exclude a single feat
                    // (Basic Arcana)
                    {
                        const skillList = Object.keys(CONFIG.PF2E.skillList);
                        const prereqs = featData.system.prerequisites.value;
                        let prerequisitesArr: string[] = [];
                        prerequisitesArr = prereqs.map((prerequisite: { value: string }) =>
                            prerequisite?.value ? prerequisite.value.toLowerCase() : ""
                        );

                        const skillIntersection = skillList.filter((x) =>
                            prerequisitesArr.some((entry) => entry.includes(x))
                        );

                        if (skillIntersection.length !== 0) {
                            skills.add(skillIntersection.join(","));
                            featData.system.skills.value = skillIntersection;
                        }
                    }

                    // Prepare source
                    const source = featData.system.source.value;
                    if (source) {
                        sources.add(source);
                        featData.system.source.value = sluggify(source);
                    }

                    // Only store essential data
                    feats.push({
                        type: featData.type,
                        name: featData.name,
                        img: featData.img,
                        uuid: `Compendium.${pack.collection}.${featData._id}`,
                        level: featData.system.level.value,
                        featType: featData.system.featType.value,
                        skills: featData.system.skills.value,
                        traits: featData.system.traits.value,
                        rarity: featData.system.traits.rarity,
                        source: featData.system.source.value,
                    });
                }
            }
        }

        // Set indexData
        this.indexData = feats;

        // Filters
        this.filterData.checkboxes.feattype.options = this.generateCheckboxOptions(CONFIG.PF2E.featTypes);
        this.filterData.checkboxes.skills.options = this.generateCheckboxOptions(CONFIG.PF2E.skillList);
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);
        this.filterData.multiselects.traits.options = this.generateMultiselectOptions({ ...CONFIG.PF2E.featTraits });

        console.debug("PF2e System | Compendium Browser | Finished loading feats");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects, sliders } = this.filterData;

        // Level
        if (!(entry.level >= sliders.level.values.min && entry.level <= sliders.level.values.max)) return false;
        // Feat types
        if (checkboxes.feattype.selected.length) {
            if (!checkboxes.feattype.selected.includes(entry.featType)) return false;
        }
        // Skills
        if (checkboxes.skills.selected.length) {
            if (!this.arrayIncludes(checkboxes.skills.selected, entry.skills)) return false;
        }
        // Traits
        const selectedTraits = multiselects.traits.selected.map((s) => s.value);
        if (selectedTraits.length > 0 && !selectedTraits.some((t) => entry.traits.includes(t))) {
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

    protected override prepareFilterData(): void {
        this.filterData = {
            checkboxes: {
                feattype: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterCategory",
                    options: {},
                    selected: [],
                },
                skills: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSkills",
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
