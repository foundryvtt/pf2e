import { getActionIcon, sluggify } from "@util";
import { CompendiumBrowser } from "..";
import { CompendiumBrowserTab } from "./base";
import { ActionFilters } from "./data";

export class CompendiumBrowserActionTab extends CompendiumBrowserTab {
    override filterData!: ActionFilters;

    protected index = ["img", "data.actionType.value", "data.traits.value", "data.source.value"];

    constructor(browser: CompendiumBrowser) {
        super(browser, "action");

        // Set the filterData object of this tab
        this.prepareFilterData();
    }

    protected override async loadData() {
        console.debug("PF2e System | Compendium Browser | Started loading actions");

        const actions: CompendiumIndexData[] = [];
        const indexFields = ["img", "data.actionType.value", "data.traits.value", "data.source.value"];
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
                    if (actionData.data.actionType.value === "passive") actionData.img = getActionIcon("passive");

                    // Prepare source
                    const source = actionData.data.source.value;
                    if (source) {
                        sources.add(source);
                        actionData.data.source.value = sluggify(source);
                    }
                    actions.push({
                        _id: actionData._id,
                        type: actionData.type,
                        name: actionData.name,
                        img: actionData.img,
                        compendium: pack.collection,
                        traits: actionData.data.traits.value,
                        source: actionData.data.source.value,
                    });
                }
            }
        }

        // Set indexData
        this.indexData = actions;

        // Set Filters
        this.filterData.checkboxes.traits.options = this.generateCheckboxOptions(CONFIG.PF2E.actionTraits);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

        console.debug("PF2e System | Compendium Browser | Finished loading actions");
    }

    protected override filterIndexData(entry: CompendiumIndexData): boolean {
        const { checkboxes, search } = this.filterData;
        // Name
        if (search.text) {
            if (!entry.name.toLocaleLowerCase(game.i18n.lang).includes(search.text.toLocaleLowerCase(game.i18n.lang)))
                return false;
        }
        // Traits
        if (checkboxes.traits.selected.length) {
            if (!this.arrayIncludes(checkboxes.traits.selected, entry.traits)) return false;
        }
        // Source
        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        return true;
    }

    protected override prepareFilterData(): void {
        this.filterData = {
            checkboxes: {
                traits: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterTraits",
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
                },
            },
            search: {
                text: "",
            },
        };
    }
}
