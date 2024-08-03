import { sluggify } from "@util";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { CompendiumBrowserIndexData, DeityFilters } from "./data.ts";

export class CompendiumBrowserDeityTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "deity";
    filterData: DeityFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/deity.hbs";

    override searchFields = ["name", "originalName"];
    override storeFields = [
        "type",
        "name",
        "img",
        "uuid",
        "source",
        "rarity",
        "category",
        "font",
        "sanctification",
        "attribute",
        "primaryDomain",
        "alternateDomain",
        "skill",
        "weapon",
    ];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading deities");

        const deities: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [
            "img",
            "system.traits",
            "system.publication",
            "system.source",
            "system.category",
            "system.font",
            "system.sanctification",
            "system.attribute",
            "system.domains",
            "system.skill",
            "system.weapon",
        ];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("deity"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const deityData of index) {
                if (deityData.type === "deity") {
                    deityData.filters = {};
                }

                const pubSource = deityData.system.publication?.title ?? deityData.system.source?.value ?? "";
                const sourceSlug = sluggify(pubSource);
                if (pubSource) publications.add(pubSource);

                deities.push({
                    type: deityData.type,
                    name: deityData.name,
                    originalName: deityData.originalName,
                    img: deityData.img,
                    uuid: deityData.uuid,
                    rarity: deityData.system.traits?.rarity,
                    source: sourceSlug,
                    category: deityData.system.category,
                    font: deityData.system.font,
                    sanctification: deityData.system.sanctification?.what ?? "none",
                    attribute: deityData.system.attribute,
                    primaryDomain: deityData.system.domains.primary,
                    alternateDomain: deityData.system.domains.alternate,
                    skill: deityData.system.skill,
                    weapon: deityData.system.weapon,
                });
            }

            this.indexData = deities;

            this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(publications);
            this.filterData.checkboxes.category.options = this.generateSourceCheckboxOptions(
                new Set(["Deity", "Pantheon", "Philosophy"]),
            );
            this.filterData.checkboxes.font.options = this.generateCheckboxOptions({ harm: "Harm", heal: "Heal" });
            console.debug("PF2e System | Compendium Browser | Finished loading deities");
        }
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes } = this.filterData;

        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        if (checkboxes.font.selected.length) {
            if (!checkboxes.font.selected.includes(entry.font)) return false;
        }
        if (checkboxes.category.selected.length) {
            if (!checkboxes.category.selected.includes(entry.category)) return false;
        }

        return true;
    }

    protected override prepareFilterData(): DeityFilters {
        return {
            checkboxes: {
                source: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSource",
                    options: {},
                    selected: [],
                },
                category: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterCategory",
                    options: {},
                    selected: [],
                },
                font: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterDivineFont",
                    options: {},
                    selected: [],
                },
                sanctification: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSanctification",
                    options: {},
                    selected: [],
                },
            },

            multiselects: {
                attribute: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterDivineAttribute",
                    options: [],
                    selected: [],
                },
                primaryDomain: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterPrimaryDomain",
                    options: [],
                    selected: [],
                },
                alternateDomain: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterAlternateDomain",
                    options: [],
                    selected: [],
                },
                skill: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterDivineSkill",
                    options: [],
                    selected: [],
                },
                weapon: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterFavoredWeapon",
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
