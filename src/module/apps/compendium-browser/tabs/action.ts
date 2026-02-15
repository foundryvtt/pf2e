import { getActionIcon } from "@module/sheet/helpers.ts";
import * as R from "remeda";
import { CompendiumBrowser } from "../browser.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.svelte.ts";
import { ActionFilters, CompendiumBrowserIndexData } from "./data.ts";

export class CompendiumBrowserActionTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "action";
    tabLabel = "PF2E.CompendiumBrowser.TabAbilities";
    declare filterData: ActionFilters;

    /* MiniSearch */
    override searchFields = ["name", "originalName"];
    override storeFields = ["name", "originalName", "img", "uuid", "options"];

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
            "system.publication",
            "system.source",
        ];
        const publications = new Set<string>();

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("action"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loading`);
            for (const actionData of index) {
                if (actionData.type !== "action") continue;
                if (!this.hasAllIndexFields(actionData, indexFields)) {
                    console.warn(
                        `Action '${actionData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`,
                    );
                    continue;
                }

                const system = actionData.system;
                // update icons for any passive actions
                if (system.actionType.value === "passive") actionData.img = getActionIcon("passive");
                const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
                const options: string[] = [
                    `action-type:${system.actionType.value}`,
                    ...system.traits.value.map((t: string) => `trait:${t.replace(/^hb_/, "")}`),
                    `type:${actionData.type}`,
                    `category:${system.category}`,
                    this.preparePublicationSource(pubSource, publications),
                ];

                actions.push({
                    name: actionData.name,
                    originalName: actionData.originalName, // Added by Babele
                    img: actionData.img,
                    uuid: actionData.uuid,
                    options: new Set(options),
                });
            }
        }

        // Set indexData
        this.indexData = actions;

        // Set Filters
        this.filterData.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.actionTraits);
        this.filterData.checkboxes.types.options = this.generateCheckboxOptions(CONFIG.PF2E.actionTypes);
        this.filterData.checkboxes.category.options = this.generateCheckboxOptions(
            R.pick(CONFIG.PF2E.actionCategories, ["familiar"]),
        );
        this.filterData.source.options = this.generateSourceCheckboxOptions(publications);

        console.debug("PF2e System | Compendium Browser | Finished loading actions");
    }

    protected override prepareFilterData(): ActionFilters {
        return {
            checkboxes: {
                types: {
                    isExpanded: true,
                    label: "PF2E.ActionActionTypeLabel",
                    options: {},
                    optionPrefix: "action-type",
                    selected: [],
                },
                category: {
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.Categories",
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
                by: "name",
                direction: "asc",
                options: {
                    name: { label: "Name", type: "alpha" },
                },
                type: "alpha",
            },
            search: {
                text: "",
            },
        };
    }
}
