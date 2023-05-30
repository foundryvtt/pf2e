import * as R from "remeda";
import { getActionIcon, sluggify } from "@util";
import { CompendiumBrowser } from "../index.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { ActionFilters, CompendiumBrowserIndexData } from "./data.ts";

export class CompendiumBrowserActionTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "action";
    filterData: ActionFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/action.hbs";

    /* MiniSearch */
    override searchFields = ["name"];
    override storeFields = ["type", "name", "img", "uuid", "traits", "source"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading actions");

        const actions: CompendiumBrowserIndexData[] = [];
        const indexFields = [
            "img",
            "system.actionType.value",
            "system.category",
            "system.traits.value",
            "system.actionType.value",
            "system.source.value",
        ];
        const sources: Set<string> = new Set();

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("action"),
            indexFields
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loading`);
            for (const actionData of index) {
                if (actionData.type === "action") {
                    if (!this.hasAllIndexFields(actionData, indexFields)) {
                        console.warn(
                            `Action '${actionData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    // update icons for any passive actions
                    if (actionData.system.actionType.value === "passive") actionData.img = getActionIcon("passive");

                    // Prepare source
                    const source = actionData.system.source.value;
                    const sourceSlug = sluggify(source);
                    if (source) {
                        sources.add(source);
                    }
                    actions.push({
                        type: actionData.type,
                        name: actionData.name,
                        img: actionData.img,
                        uuid: `Compendium.${pack.collection}.${actionData._id}`,
                        traits: actionData.system.traits.value,
                        actionType: actionData.system.actionType.value,
                        category: actionData.system.category,
                        source: sourceSlug,
                    });
                }
            }
        }

        // Set indexData
        this.indexData = actions;

        // Set Filters
        this.filterData.multiselects.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.actionTraits);
        this.filterData.checkboxes.types.options = this.generateCheckboxOptions(CONFIG.PF2E.actionTypes);
        this.filterData.checkboxes.category.options = this.generateCheckboxOptions(
            R.pick(CONFIG.PF2E.actionCategories, ["familiar"])
        );
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

        console.debug("PF2e System | Compendium Browser | Finished loading actions");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects } = this.filterData;

        // Types
        if (checkboxes.types.selected.length) {
            if (!checkboxes.types.selected.includes(entry.actionType)) return false;
        }
        // Categories
        if (checkboxes.category.selected.length) {
            const selected = checkboxes.category.selected;
            if (!selected.includes(entry.category)) return false;
        }
        // Traits
        if (!this.filterTraits(entry.traits, multiselects.traits.selected, multiselects.traits.conjunction))
            return false;
        // Source
        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        return true;
    }

    protected override prepareFilterData(): ActionFilters {
        return {
            checkboxes: {
                types: {
                    isExpanded: true,
                    label: "PF2E.ActionActionTypeLabel",
                    options: {},
                    selected: [],
                },
                category: {
                    isExpanded: true,
                    label: "PF2E.ActionActionTypeLabel",
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
                by: "name",
                direction: "asc",
                options: {
                    name: "PF2E.BrowserSortyByNameLabel",
                },
            },
            search: {
                text: "",
            },
        };
    }
}
