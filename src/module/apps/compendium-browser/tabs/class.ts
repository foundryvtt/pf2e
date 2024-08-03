import { sluggify } from "@util";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { ClassFilters, CompendiumBrowserIndexData } from "./data.ts";

export class CompendiumBrowserClassTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "class";
    filterData: ClassFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/class.hbs";

    override searchFields = ["name", "originalName"];
    override storeFields = ["img", "name", "hitpoints", "keyAttribute", "rarity", "type", "uuid", "traits", "source"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading classes");
        const classes: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [
            "img",
            "system.traits",
            "system.hp",
            "system.keyAbility",
            "system.publication",
            "system.source",
        ];
        const classHitpoints = {
            6: "6",
            8: "8",
            10: "10",
            12: "12",
        };

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("class"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const classData of index) {
                if (classData.type === "class") {
                    classData.filters = {};
                }

                const pubSource = classData.system.publication?.title ?? classData.system.source?.value ?? "";
                const sourceSlug = sluggify(pubSource);
                if (pubSource) publications.add(pubSource);

                classes.push({
                    type: classData.type,
                    name: classData.name,
                    originalName: classData.originalName,
                    img: classData.img,
                    uuid: classData.uuid,
                    rarity: classData.system.traits.rarity,
                    source: sourceSlug,
                    hitpoints: classData.system.hp.toString(),
                    keyAttribute: classData.system.keyAbility.value,
                });
            }

            this.indexData = classes;

            this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(publications);
            this.filterData.checkboxes.hitpoints.options = this.generateCheckboxOptions(classHitpoints);
            this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits);
            this.filterData.multiselects.keyAttribute.options = this.generateMultiselectOptions(CONFIG.PF2E.abilities);

            console.debug("PF2e System | Compendium Browser | Finished loading classes");
        }
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects } = this.filterData;

        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        if (checkboxes.hitpoints.selected.length) {
            if (!checkboxes.hitpoints.selected.includes(entry.hitpoints)) return false;
        }
        if (
            !this.filterTraits(
                entry.keyAttribute,
                multiselects.keyAttribute.selected,
                multiselects.keyAttribute.conjunction,
            )
        )
            return false;

        if (checkboxes.rarity.selected.length) {
            if (!checkboxes.rarity.selected.includes(entry.rarity)) return false;
        }

        return true;
    }

    protected override prepareFilterData(): ClassFilters {
        return {
            checkboxes: {
                source: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSource",
                    options: {},
                    selected: [],
                },
                hitpoints: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterHitPoints",
                    options: {},
                    selected: [],
                },
                rarity: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterRarities",
                    options: {},
                    selected: [],
                },
            },
            multiselects: {
                keyAttribute: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterKeyAttribute",
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
