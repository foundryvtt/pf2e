import { sluggify } from "@util";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { BackgroundFilters, CompendiumBrowserIndexData } from "./data.ts";

export class CompendiumBrowserBackgroundTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "background";
    filterData: BackgroundFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/background.hbs";

    override searchFields = ["name", "originalName"];
    override storeFields = ["img", "name", "type", "uuid", "skills", "lore", "feats", "traits", "source", "rarity"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading backgrounds");

        const backgrounds: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [
            "img",
            "system.traits",
            "system.publication",
            "system.source",
            "system.boosts",
            "system.trainedSkills",
            "system.items",
        ];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("background"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const backgroundData of index) {
                if (backgroundData.type === "background") {
                    if (!this.hasAllIndexFields(backgroundData, indexFields)) {
                        console.warn(
                            `Background '${backgroundData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`,
                        );
                        continue;
                    }

                    // Prepare source
                    const pubSource =
                        backgroundData.system.publication?.title ?? backgroundData.system.source?.value ?? "";
                    const sourceSlug = sluggify(pubSource);
                    if (pubSource) publications.add(pubSource);

                    // Only store essential data
                    backgrounds.push({
                        type: backgroundData.type,
                        name: backgroundData.name,
                        originalName: backgroundData.originalName, // Added by Babele
                        img: backgroundData.img,
                        uuid: backgroundData.uuid,
                        rarity: backgroundData.system.traits.rarity,
                        source: sourceSlug,
                        boosts: backgroundData.system.boosts[0].value,
                        skills: backgroundData.system.trainedSkills.value,
                        lores: backgroundData.system.trainedSkills.lore
                            .map((t: string) => {
                                return sluggify(t);
                            })
                            .filter((lore: string) => lore !== undefined),
                        feats: Object.keys(backgroundData.system.items).map((key) => {
                            return sluggify(backgroundData.system.items[key].name);
                        }),
                    });
                }
            }

            // Creates a list of filter options for skill feats
            const featOptions = Object.fromEntries(
                backgrounds
                    .map((t) => {
                        return t.feats.flatMap((feat: string) => {
                            const featString = feat.replaceAll("-", " ").titleCase();
                            return [feat, featString];
                        });
                    })
                    .filter(([_value, label]) => label !== undefined),
            );

            // Create a list of filter options for lore skills
            const loreOptions = Object.fromEntries(
                backgrounds
                    .map((t) => {
                        return t.lores.flatMap((lore: string) => {
                            const loreString = lore.replaceAll("-", " ").titleCase();
                            return [lore, loreString];
                        });
                    })
                    .filter(([_value, label]) => label !== undefined),
            );

            const skillList = Object.fromEntries(
                Object.keys(CONFIG.PF2E.skills).map((t) => {
                    const skills = CONFIG.PF2E.skills as { [key: string]: { label: string; attribute: string } };
                    return [t, skills[t].label];
                }),
            );

            // Set indexData
            this.indexData = backgrounds;

            // Filters
            this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(publications);
            this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits);
            this.filterData.multiselects.boosts.options = this.generateMultiselectOptions(CONFIG.PF2E.abilities);
            this.filterData.multiselects.skills.options = this.generateMultiselectOptions(skillList);
            this.filterData.multiselects.lores.options = this.generateMultiselectOptions(loreOptions);
            this.filterData.multiselects.feats.options = this.generateMultiselectOptions(featOptions);

            console.debug("PF2e System | Compendium Browser | Finished loading backgrounds");
        }
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects } = this.filterData;

        // Source
        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        // Rarity
        if (checkboxes.rarity.selected.length) {
            if (!checkboxes.rarity.selected.includes(entry.rarity)) return false;
        }
        // Boosts
        if (!this.filterTraits(entry.boosts, multiselects.boosts.selected, multiselects.boosts.conjunction))
            return false;
        // Skills
        if (!this.filterTraits(entry.skills, multiselects.skills.selected, multiselects.skills.conjunction))
            return false;
        // Lores
        if (!this.filterTraits(entry.lores, multiselects.lores.selected, multiselects.lores.conjunction)) return false;
        // Feats
        if (!this.filterTraits(entry.feats, multiselects.feats.selected, multiselects.feats.conjunction)) return false;

        return true;
    }

    protected override prepareFilterData(): BackgroundFilters {
        return {
            checkboxes: {
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
                boosts: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterBoosts",
                    options: [],
                    selected: [],
                },
                skills: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterSkills",
                    options: [],
                    selected: [],
                },
                lores: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterLores",
                    options: [],
                    selected: [],
                },
                feats: {
                    conjunction: "or",
                    label: "PF2E.BrowserFilterFeats",
                    options: [],
                    selected: [],
                },
            },
            order: {
                by: "name",
                direction: "asc",
                options: {
                    name: "Name",
                },
            },
            search: {
                text: "",
            },
        };
    }
}
