import { isObject, sluggify } from "@util";
import { CompendiumBrowser } from "../index.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { CompendiumBrowserIndexData, FeatFilters } from "./data.ts";

export class CompendiumBrowserFeatTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "feat";
    filterData: FeatFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/feat.hbs";

    /* MiniSearch */
    override searchFields = ["name"];
    override storeFields = ["type", "name", "img", "uuid", "level", "category", "skills", "traits", "rarity", "source"];

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
            // Migrated to `system.category` but still retrieved in case of unmigrated items
            // Remove in system version 5?
            "system.featType.value",
            "system.level.value",
            "system.prerequisites.value",
            "system.source.value",
            "system.traits",
        ];

        const translatedSkills = Object.entries(CONFIG.PF2E.skillList).reduce(
            (result: Record<string, string>, [key, value]) => {
                return {
                    ...result,
                    [key]: game.i18n.localize(value).toLocaleLowerCase(game.i18n.lang),
                };
            },
            {}
        );
        const skillList = Object.entries(translatedSkills);

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("feat"),
            indexFields
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const featData of index) {
                if (featData.type === "feat") {
                    featData.filters = {};
                    // Check separately for one of "system.category or "system.featType.value" to provide backward
                    // compatible support for unmigrated feats in non-system compendiums.
                    const categoryPaths = ["system.category", "system.featType.value"];
                    const nonCategoryPaths = indexFields.filter((f) => !categoryPaths.includes(f));
                    const categoryPathFound = categoryPaths.some((p) => foundry.utils.hasProperty(featData, p));

                    if (!this.hasAllIndexFields(featData, nonCategoryPaths) || !categoryPathFound) {
                        console.warn(
                            `Feat "${featData.name}" does not have all required data fields.`,
                            `Consider unselecting pack "${pack.metadata.label}" in the compendium browser settings.`
                        );
                        continue;
                    }

                    // Accommodate deprecated featType objects
                    const featType: unknown = featData.system.featType;
                    if (isObject(featType) && "value" in featType && typeof featType.value === "string") {
                        featData.system.category = featType.value;
                        delete featData.system.featType;
                    }

                    // Prerequisites are strings that could contain translated skill names
                    const prereqs: { value: string }[] = featData.system.prerequisites.value;
                    const prerequisitesArr = prereqs.map((prerequisite) =>
                        prerequisite?.value ? prerequisite.value.toLowerCase() : ""
                    );
                    const skills: Set<string> = new Set();
                    for (const prereq of prerequisitesArr) {
                        for (const [key, value] of skillList) {
                            // Check the string for the english translation key or a translated skill name
                            if (prereq.includes(key) || prereq.includes(value)) {
                                // Alawys record the translation key to enable filtering
                                skills.add(key);
                            }
                        }
                    }

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
                        level: featData.system.level.value,
                        category: featData.system.category,
                        skills: [...skills],
                        traits: featData.system.traits.value,
                        rarity: featData.system.traits.rarity,
                        source: sourceSlug,
                    });
                }
            }
        }

        // Set indexData
        this.indexData = feats;

        // Filters
        this.filterData.checkboxes.category.options = this.generateCheckboxOptions(CONFIG.PF2E.featCategories);
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
        if (checkboxes.category.selected.length) {
            if (!checkboxes.category.selected.includes(entry.category)) return false;
        }
        // Skills
        if (checkboxes.skills.selected.length) {
            if (!this.arrayIncludes(checkboxes.skills.selected, entry.skills)) return false;
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

    protected override prepareFilterData(): FeatFilters {
        return {
            checkboxes: {
                category: {
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
