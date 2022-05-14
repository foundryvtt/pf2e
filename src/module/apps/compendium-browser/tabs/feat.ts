import { sluggify } from "@util";
import { CompendiumBrowser } from "..";
import { CompendiumBrowserTab } from "./base";
import { FeatFilters } from "./data";

export class CompendiumBrowserFeatTab extends CompendiumBrowserTab {
    override filterData!: FeatFilters;

    constructor(browser: CompendiumBrowser) {
        super(browser, "feat");

        // Set the filterData object of this tab
        this.prepareFilterData();
    }

    protected override async loadData() {
        console.debug("PF2e System | Compendium Browser | Started loading feats");

        const feats: CompendiumIndexData[] = [];
        const classes: Set<string> = new Set();
        const skills: Set<string> = new Set();
        const ancestries: Set<string> = new Set();
        const ancestryList = Object.keys(CONFIG.PF2E.ancestryTraits);
        const sources: Set<string> = new Set();
        const indexFields = [
            "img",
            "data.prerequisites.value",
            "data.actionType.value",
            "data.actions.value",
            "data.featType.value",
            "data.level.value",
            "data.traits",
            "data.source.value",
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
                    featData.data.classes = { value: [] };
                    featData.data.ancestry = { value: [] };
                    featData.data.skills = { value: [] };
                    // determining attributes from traits
                    if (featData.data.traits.value) {
                        // determine class feats
                        const classList = Object.keys(CONFIG.PF2E.classTraits);
                        const classIntersection = classList.filter((x) => featData.data.traits.value.includes(x));
                        if (classIntersection.length !== 0) {
                            classes.add(classIntersection.join(","));
                            featData.data.classes.value = classIntersection;
                        }

                        if (featData.data.featType.value === "ancestry") {
                            const ancestryIntersection = ancestryList.filter((x) =>
                                featData.data.traits.value.includes(x)
                            );

                            if (ancestryIntersection.length !== 0) {
                                ancestries.add(ancestryIntersection.join(","));
                                featData.data.ancestry.value = ancestryIntersection;
                            }
                        }
                    }

                    // determine skill prerequisites
                    // Note: This code includes some feats, where the prerequisite has the name of a skill.
                    // I decided to include them. The code would not be worth it, to exclude a single feat
                    // (Basic Arcana)
                    {
                        const skillList = Object.keys(CONFIG.PF2E.skillList);
                        const prereqs = featData.data.prerequisites.value;
                        let prerequisitesArr: string[] = [];
                        prerequisitesArr = prereqs.map((prerequisite: { value: string }) =>
                            prerequisite?.value ? prerequisite.value.toLowerCase() : ""
                        );

                        const skillIntersection = skillList.filter((x) =>
                            prerequisitesArr.some((entry) => entry.includes(x))
                        );

                        if (skillIntersection.length !== 0) {
                            skills.add(skillIntersection.join(","));
                            featData.data.skills.value = skillIntersection;
                        }
                    }

                    // Prepare source
                    const source = featData.data.source.value;
                    if (source) {
                        sources.add(source);
                        featData.data.source.value = sluggify(source);
                    }

                    // Only store essential data
                    feats.push({
                        _id: featData._id,
                        type: featData.type,
                        name: featData.name,
                        img: featData.img,
                        compendium: pack.collection,
                        level: featData.data.level.value,
                        featType: featData.data.featType.value,
                        classes: featData.data.classes.value,
                        skills: featData.data.skills.value,
                        ancestry: featData.data.ancestry.value,
                        traits: featData.data.traits.value,
                        rarity: featData.data.traits.rarity,
                        source: featData.data.source.value,
                    });
                }
            }
        }

        // Exclude ancestry and class traits since they're separately searchable
        const excludedTraits = new Set([...ancestries, ...classes]);
        const featTraits = Object.fromEntries(
            Object.entries(CONFIG.PF2E.featTraits).filter(([key]) => !excludedTraits.has(key))
        );

        // Set indexData
        this.indexData = feats;

        // Filters
        this.filterData.checkboxes.feattype.options = this.generateCheckboxOptions(CONFIG.PF2E.featTypes);
        this.filterData.checkboxes.classes.options = this.generateCheckboxOptions(CONFIG.PF2E.classTraits);
        this.filterData.checkboxes.skills.options = this.generateCheckboxOptions(CONFIG.PF2E.skillList);
        this.filterData.checkboxes.ancestry.options = this.generateCheckboxOptions(CONFIG.PF2E.ancestryTraits);
        this.filterData.checkboxes.traits.options = this.generateCheckboxOptions(featTraits);
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

        console.debug("PF2e System | Compendium Browser | Finished loading feats");
    }

    protected override filterIndexData(entry: CompendiumIndexData): boolean {
        const { checkboxes, search, sliders } = this.filterData;

        // Level
        if (!(entry.level >= sliders.level.values.min && entry.level <= sliders.level.values.max)) return false;
        // Name
        if (search.text) {
            if (!entry.name.toLocaleLowerCase(game.i18n.lang).includes(search.text.toLocaleLowerCase(game.i18n.lang)))
                return false;
        }
        // Feat types
        if (checkboxes.feattype.selected.length) {
            if (!checkboxes.feattype.selected.includes(entry.featType)) return false;
        }
        // Classes
        if (checkboxes.classes.selected.length) {
            if (!this.arrayIncludes(checkboxes.classes.selected, entry.classes)) return false;
        }
        // Skills
        if (checkboxes.skills.selected.length) {
            if (!this.arrayIncludes(checkboxes.skills.selected, entry.skills)) return false;
        }
        // Ancestries
        if (checkboxes.ancestry.selected.length) {
            if (!this.arrayIncludes(checkboxes.ancestry.selected, entry.ancestry)) return false;
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
                feattype: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterCategory",
                    options: {},
                    selected: [],
                },
                classes: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterClass",
                    options: {},
                    selected: [],
                },
                skills: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSkills",
                    options: {},
                    selected: [],
                },
                ancestry: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterAncestries",
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
                by: "name",
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
