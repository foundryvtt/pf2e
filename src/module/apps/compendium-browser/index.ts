import { Progress } from "./progress";
import { PhysicalItemPF2e } from "@item/physical";
import { KitPF2e } from "@item/kit";
import { ErrorPF2e, isObject, objectHasKey } from "@util";
import { LocalizePF2e } from "@system/localize";
import * as browserTabs from "./tabs";
import { TabData, PackInfo, TabName, BrowserTab, SortDirection } from "./data";
import {
    BaseFilterData,
    CheckboxData,
    InitialActionFilters,
    InitialBestiaryFilters,
    InitialEquipmentFilters,
    InitialFeatFilters,
    InitialFilters,
    InitialHazardFilters,
    InitialSpellFilters,
    RangesData,
    RenderResultListOptions,
} from "./tabs/data";
import { getSelectedOrOwnActors } from "@util/token-actor-utils";
import noUiSlider from "nouislider";
import { SpellcastingEntryPF2e } from "@item";
import Tagify from "@yaireo/tagify";
import { CoinsPF2e } from "@item/physical/helpers";

class PackLoader {
    loadedPacks: {
        Actor: Record<string, { pack: CompendiumCollection; index: CompendiumIndex } | undefined>;
        Item: Record<string, { pack: CompendiumCollection; index: CompendiumIndex } | undefined>;
    } = { Actor: {}, Item: {} };

    async *loadPacks(documentType: "Actor" | "Item", packs: string[], indexFields: string[]) {
        this.loadedPacks[documentType] ??= {};
        const translations = LocalizePF2e.translations.PF2E.CompendiumBrowser.ProgressBar;

        const progress = new Progress({ steps: packs.length });
        for (const packId of packs) {
            let data = this.loadedPacks[documentType][packId];
            if (data) {
                const { pack } = data;
                progress.advance(game.i18n.format(translations.LoadingPack, { pack: pack?.metadata.label ?? "" }));
            } else {
                const pack = game.packs.get(packId);
                if (!pack) {
                    progress.advance("");
                    continue;
                }
                progress.advance(game.i18n.format(translations.LoadingPack, { pack: pack.metadata.label }));
                if (pack.documentName === documentType) {
                    const index = await pack.getIndex({ fields: indexFields });
                    const firstResult: Partial<CompendiumIndexData> = index.contents.at(0) ?? {};
                    // Every result should have the "system" property otherwise the indexFields were wrong for that pack
                    if (firstResult.system) {
                        this.setModuleArt(packId, index);
                        data = { pack, index };
                        this.loadedPacks[documentType][packId] = data;
                    } else {
                        ui.notifications.warn(
                            game.i18n.format("PF2E.BrowserWarnPackNotLoaded", { pack: pack.collection })
                        );
                        continue;
                    }
                } else {
                    continue;
                }
            }

            yield data;
        }
        progress.close(translations.LoadingComplete);
    }

    /** Set art provided by a module if any is available */
    private setModuleArt(packName: string, index: CompendiumIndex): void {
        if (!packName.startsWith("pf2e.")) return;
        for (const record of index) {
            const actorArt = game.pf2e.system.moduleArt.map.get(`Compendium.${packName}.${record._id}`)?.actor;
            record.img = actorArt ?? record.img;
        }
    }
}

class CompendiumBrowser extends Application {
    settings: CompendiumBrowserSettings;
    dataTabsList = ["action", "bestiary", "equipment", "feat", "hazard", "spell"] as const;
    tabs: Record<Exclude<TabName, "settings">, BrowserTab>;
    packLoader = new PackLoader();
    activeTab!: TabName;
    navigationTab!: Tabs;

    /** An initial filter to be applied upon loading a tab */
    private initialFilter: InitialFilters = {};

    constructor(options = {}) {
        super(options);

        this.tabs = {
            action: new browserTabs.Actions(this),
            bestiary: new browserTabs.Bestiary(this),
            equipment: new browserTabs.Equipment(this),
            feat: new browserTabs.Feats(this),
            hazard: new browserTabs.Hazards(this),
            spell: new browserTabs.Spells(this),
        };

        this.settings = game.settings.get("pf2e", "compendiumBrowserPacks");

        this.initCompendiumList();
        this.injectActorDirectory();
        this.hookTab();
    }

    override get title(): string {
        return game.i18n.localize("PF2E.CompendiumBrowser.Title");
    }

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "compendium-browser",
            classes: [],
            template: "systems/pf2e/templates/compendium-browser/compendium-browser.hbs",
            width: 800,
            height: 700,
            resizable: true,
            dragDrop: [{ dragSelector: "ul.item-list > li.item" }],
            tabs: [
                {
                    navSelector: "nav",
                    contentSelector: "section.content",
                    initial: "landing-page",
                },
            ],
            scrollY: [".control-area", ".item-list"],
        });
    }

    /** Reset initial filtering */
    override async close(options?: { force?: boolean }): Promise<void> {
        this.initialFilter = {};
        for (const tab of Object.values(this.tabs)) {
            tab.filterData.search.text = "";
        }

        await super.close(options);
    }

    initCompendiumList(): void {
        const settings: Omit<TabData<Record<string, PackInfo | undefined>>, "settings"> = {
            action: {},
            bestiary: {},
            hazard: {},
            equipment: {},
            feat: {},
            spell: {},
        };

        // NPCs and Hazards are all loaded by default other packs can be set here.
        const loadDefault: Record<string, boolean | undefined> = {
            "pf2e.actionspf2e": true,
            "pf2e.equipment-srd": true,
            "pf2e.ancestryfeatures": true,
            "pf2e.classfeatures": true,
            "pf2e.feats-srd": true,
            "pf2e.spells-srd": true,
        };

        for (const pack of game.packs) {
            const types = new Set(pack.index.map((entry) => entry.type));
            if (types.size === 0) continue;

            if (types.has("npc")) {
                const load = this.settings.bestiary?.[pack.collection]?.load ?? true;
                settings.bestiary![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            }
            if (types.has("hazard")) {
                const load = this.settings.hazard?.[pack.collection]?.load ?? true;
                settings.hazard![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            }

            if (types.has("action")) {
                const load = this.settings.action?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.action![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            } else if (
                ["weapon", "armor", "equipment", "consumable", "treasure", "backpack", "kit"].some((type) =>
                    types.has(type)
                )
            ) {
                const load = this.settings.equipment?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.equipment![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            } else if (types.has("feat")) {
                const load = this.settings.feat?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.feat![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            } else if (types.has("spell")) {
                const load = this.settings.spell?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.spell![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            }
        }

        for (const tab of this.dataTabsList) {
            settings[tab] = Object.fromEntries(
                Object.entries(settings[tab]!).sort(([_collectionA, dataA], [_collectionB, dataB]) => {
                    return (dataA?.name ?? "") > (dataB?.name ?? "") ? 1 : -1;
                })
            );
        }

        this.settings = settings;
    }

    hookTab(): void {
        this.navigationTab = this._tabs[0];
        const tabCallback = this.navigationTab.callback;
        this.navigationTab.callback = async (event: JQuery.TriggeredEvent | null, tabs: Tabs, active: TabName) => {
            tabCallback?.(event, tabs, active);
            await this.loadTab(active);
        };
    }

    openTab(tab: "action", filter?: InitialActionFilters): Promise<void>;
    openTab(tab: "bestiary", filter?: InitialBestiaryFilters): Promise<void>;
    openTab(tab: "equipment", filter?: InitialEquipmentFilters): Promise<void>;
    openTab(tab: "feat", filter?: InitialFeatFilters): Promise<void>;
    openTab(tab: "hazard", filter?: InitialHazardFilters): Promise<void>;
    openTab(tab: "spell", filter?: InitialSpellFilters): Promise<void>;
    openTab(tab: "settings"): Promise<void>;
    async openTab(tab: TabName, filter: InitialFilters = {}): Promise<void> {
        this.initialFilter = filter;
        await this._render(true);
        this.initialFilter = filter; // Reapply in case of a double-render (need to track those down)
        this.navigationTab.activate(tab, { triggerCallback: true });
    }

    async openSpellTab(entry: SpellcastingEntryPF2e, level = 10): Promise<void> {
        const filter: { category: string[]; level: number[]; traditions: string[] } = {
            category: [],
            level: [],
            traditions: [],
        };

        if (entry.isRitual || entry.isFocusPool) {
            filter.category.push(entry.system.prepared.value);
        }

        if (level) {
            filter.level.push(...Array.from(Array(level).keys()).map((l) => l + 1));

            if (entry.isPrepared || entry.isSpontaneous || entry.isInnate) {
                filter.category.push("spell");
            }
        }

        if (entry.tradition && !entry.isFocusPool && !entry.isRitual) {
            filter.traditions.push(entry.tradition);
        }

        this.openTab("spell", filter);
    }

    async loadTab(tab: TabName): Promise<void> {
        this.activeTab = tab;
        // Settings tab
        if (tab === "settings") {
            await this.render(true);
            return;
        }

        if (!this.dataTabsList.includes(tab)) {
            throw ErrorPF2e(`Unknown tab "${tab}"`);
        }

        const currentTab = this.tabs[tab];

        // Initialize Tab if it is not already initialzed
        if (!currentTab?.isInitialized) {
            await currentTab?.init();
        }

        this.processInitialFilters(currentTab);

        this.render(true);
    }

    private processInitialFilters(currentTab: BrowserTab): void {
        // Reset filters if new filters were provided
        if (this.initialFilter && Object.keys(this.initialFilter).length > 0) {
            currentTab.resetFilters();
        }

        // Search text filter
        if (this.initialFilter.searchText) {
            currentTab.filterData.search.text = this.initialFilter.searchText;
        }

        // Sorting
        currentTab.filterData.order.by = this.initialFilter.orderBy ?? currentTab.filterData.order.by;
        currentTab.filterData.order.direction =
            this.initialFilter.orderDirection ?? currentTab.filterData.order.direction;

        for (const [filterType, filterValue] of Object.entries(this.initialFilter)) {
            const mappedFilterType = (() => {
                if (filterType === "levelRange") {
                    return "level";
                } else if (filterType === "priceRange") {
                    return "price";
                }
                return filterType;
            })();

            if (
                currentTab.filterData.checkboxes &&
                objectHasKey(currentTab.filterData.checkboxes, mappedFilterType) &&
                Array.isArray(filterValue)
            ) {
                // Checkboxes
                const checkbox = currentTab.filterData.checkboxes[mappedFilterType];
                for (const value of filterValue) {
                    const option = checkbox.options[value];
                    if (option) {
                        checkbox.isExpanded = true;
                        checkbox.selected.push(value);
                        option.selected = true;
                    } else {
                        console.warn(
                            `Tab '${currentTab.tabName}' checkboxes filter '${mappedFilterType}' has no option: '${value}'`
                        );
                    }
                }
            } else if (
                currentTab.filterData.selects &&
                objectHasKey(currentTab.filterData.selects, mappedFilterType) &&
                typeof filterValue === "string"
            ) {
                // Selects
                const select = currentTab.filterData.selects[mappedFilterType];
                const option = select.options[filterValue];
                if (option) {
                    select.selected = filterValue;
                } else {
                    console.warn(
                        `Tab '${currentTab.tabName}' select filter '${mappedFilterType}' has no option: '${filterValue}'`
                    );
                }
            } else if (
                currentTab.filterData.multiselects &&
                objectHasKey(currentTab.filterData.multiselects, mappedFilterType) &&
                Array.isArray(filterValue)
            ) {
                // Multiselects
                // A convoluted cast is necessary here to not get an infered type of MultiSelectData<PhysicalItem> since MultiSelectData is not exported
                const multiselects = (currentTab.filterData.multiselects as BaseFilterData["multiselects"])!;
                const multiselect = multiselects[mappedFilterType];
                for (const value of filterValue) {
                    const option = multiselect.options.find((opt) => opt.value === value);
                    if (option) {
                        multiselect.selected.push(option);
                    } else {
                        console.warn(
                            `Tab '${currentTab.tabName}' multiselect filter '${mappedFilterType}' has no option: '${value}'`
                        );
                    }
                }
            } else if (
                currentTab.filterData.ranges &&
                objectHasKey(currentTab.filterData.ranges, mappedFilterType) &&
                this.#isRange(filterValue)
            ) {
                // Ranges (e.g. price)
                if (
                    (filterValue.min !== undefined && filterValue.min !== null) ||
                    (filterValue.max !== undefined && filterValue.max !== null)
                ) {
                    const range = currentTab.filterData.ranges[mappedFilterType];
                    if (filterType === "priceRange") {
                        if (filterValue.min !== null && filterValue.min !== undefined) {
                            if (typeof filterValue.min === "number") {
                                // Number values are handled as a price in gold pieces
                                range.values.min = new CoinsPF2e({ gp: filterValue.min }).copperValue;
                                range.values.inputMin = filterValue.min + "gp";
                            } else if (typeof filterValue.min === "string") {
                                range.values.min = CoinsPF2e.fromString(filterValue.min).copperValue;
                                range.values.inputMin = filterValue.min;
                            }
                        }
                        if (filterValue.max !== null && filterValue.max !== undefined) {
                            if (typeof filterValue.max === "number") {
                                // Number values are handled as a price in gold pieces
                                range.values.max = new CoinsPF2e({ gp: filterValue.max }).copperValue;
                                range.values.inputMax = filterValue.max + "gp";
                            } else if (typeof filterValue.max === "string") {
                                range.values.max = CoinsPF2e.fromString(filterValue.max).copperValue;
                                range.values.inputMax = filterValue.max;
                            }
                        }
                    } else {
                        // If there is ever another range filter, it should be handled here
                        console.error("Initital filtering for ranges other than price aren't implemented yet.");
                        continue;
                    }

                    // Set max value to min value if min value is higher
                    if (range.values.min > range.values.max) {
                        range.values.max = range.values.min;
                        range.values.inputMax = range.values.inputMin;
                    }

                    range.isExpanded = true;
                }
            } else if (
                currentTab.filterData.sliders &&
                objectHasKey(currentTab.filterData.sliders, mappedFilterType) &&
                this.#isRange(filterValue) &&
                (typeof filterValue.min === "number" || typeof filterValue.max === "number")
            ) {
                // Sliders (e.g. level)
                const slider = currentTab.filterData.sliders[mappedFilterType];

                const minValue =
                    typeof filterValue.min === "number"
                        ? Math.clamped(filterValue.min, slider.values.lowerLimit, slider.values.upperLimit) || 0
                        : slider.values.lowerLimit;
                const maxValue = Math.max(
                    minValue,
                    typeof filterValue.max === "number"
                        ? Math.clamped(filterValue.max, slider.values.lowerLimit, slider.values.upperLimit) || 0
                        : slider.values.upperLimit
                );

                slider.values.min = minValue;
                slider.values.max = maxValue;
                slider.isExpanded = true;
            }
            // Filter name did not match a filter on the tab
            else {
                console.warn(`'${filterType}' is not a valid filter for tab '${currentTab.tabName}'.`);
            }
        }

        this.initialFilter = {};
    }

    #isRange(value: unknown): value is { min?: number | string; max?: number | string } {
        return (
            isObject<{ min: unknown; max: unknown }>(value) &&
            (["number", "string"].includes(typeof value.min) || ["number", "string"].includes(typeof value.max))
        );
    }

    loadedPacks(tab: TabName): string[] {
        if (tab === "settings") return [];
        return Object.entries(this.settings[tab] ?? []).flatMap(([collection, info]) => {
            return info?.load ? [collection] : [];
        });
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];
        const activeTabName = this.activeTab;

        // Settings Tab
        if (activeTabName === "settings") {
            const form = html.querySelector<HTMLFormElement>(".compendium-browser-settings form");
            if (form) {
                form.querySelector("button.save-settings")?.addEventListener("click", async () => {
                    const formData = new FormData(form);
                    for (const [t, packs] of Object.entries(this.settings) as [string, { [key: string]: PackInfo }][]) {
                        for (const [key, pack] of Object.entries(packs) as [string, PackInfo][]) {
                            pack.load = formData.has(`${t}-${key}`);
                        }
                    }
                    await game.settings.set("pf2e", "compendiumBrowserPacks", this.settings);
                    for (const tab of Object.values(this.tabs)) {
                        if (tab.isInitialized) {
                            await tab.init();
                            tab.scrollLimit = 100;
                        }
                    }
                    this.render(true);
                });
            }
            return;
        }

        // Other tabs
        const currentTab = this.tabs[activeTabName];
        const controlArea = html.querySelector<HTMLDivElement>("div.control-area");
        if (!controlArea) return;

        // Search field
        const search = controlArea.querySelector<HTMLInputElement>("input[name=textFilter]");
        if (search) {
            search.addEventListener("input", () => {
                currentTab.filterData.search.text = search.value;
                this.clearScrollLimit();
                this.renderResultList({ replace: true });
            });
        }

        // Sort item list
        const sortContainer = controlArea.querySelector<HTMLDivElement>("div.sortcontainer");
        if (sortContainer) {
            const order = sortContainer.querySelector<HTMLSelectElement>("select.order");
            if (order) {
                order.addEventListener("change", () => {
                    const orderBy = order.value ?? "name";
                    currentTab.filterData.order.by = orderBy;
                    this.clearScrollLimit(true);
                });
            }
            const directionAnchor = sortContainer.querySelector<HTMLAnchorElement>("a.direction");
            if (directionAnchor) {
                directionAnchor.addEventListener("click", () => {
                    const direction = (directionAnchor.dataset.direction as SortDirection) ?? "asc";
                    currentTab.filterData.order.direction = direction === "asc" ? "desc" : "asc";
                    this.clearScrollLimit(true);
                });
            }
        }

        if (activeTabName === "spell") {
            const timeFilter = controlArea.querySelector<HTMLSelectElement>("select[name=timefilter]");
            if (timeFilter) {
                timeFilter.addEventListener("change", () => {
                    if (!currentTab.filterData?.selects?.timefilter) return;
                    currentTab.filterData.selects.timefilter.selected = timeFilter.value;
                    this.clearScrollLimit(true);
                });
            }
        }

        // Clear all filters button
        controlArea.querySelector<HTMLButtonElement>("button.clear-filters")?.addEventListener("click", () => {
            this.resetFilters();
            this.clearScrollLimit(true);
        });

        // Filters
        const filterContainers = controlArea.querySelectorAll<HTMLDivElement>("div.filtercontainer");
        for (const container of Array.from(filterContainers)) {
            const { filterType, filterName } = container.dataset;
            // Clear this filter button
            container
                .querySelector<HTMLButtonElement>("button[data-action=clear-filter]")
                ?.addEventListener("click", (event) => {
                    event.stopImmediatePropagation();
                    switch (filterType) {
                        case "checkboxes": {
                            const checkboxes = currentTab.filterData.checkboxes;
                            if (objectHasKey(checkboxes, filterName)) {
                                for (const option of Object.values(checkboxes[filterName].options)) {
                                    option.selected = false;
                                }
                                checkboxes[filterName].selected = [];
                                this.render(true);
                            }
                            break;
                        }
                        case "ranges": {
                            const ranges = currentTab.filterData.ranges!;
                            if (objectHasKey(ranges, filterName)) {
                                ranges[filterName].values = currentTab.defaultFilterData.ranges![filterName].values;
                                ranges[filterName].changed = false;
                                this.render(true);
                            }
                        }
                    }
                });

            // Toggle visibility of filter container
            const title = container.querySelector<HTMLDivElement>("div.title");
            title?.addEventListener("click", () => {
                if (filterType === "checkboxes" || filterType === "ranges" || filterType === "sliders") {
                    const filters = currentTab.filterData[filterType];
                    if (filters && objectHasKey(filters, filterName)) {
                        // This needs a type assertion because it resolves to never for some reason
                        const filter = filters[filterName] as CheckboxData | RangesData;
                        filter.isExpanded = !filter.isExpanded;
                        const contentElement = title.nextElementSibling;
                        if (contentElement instanceof HTMLElement) {
                            filter.isExpanded
                                ? (contentElement.style.display = "")
                                : (contentElement.style.display = "none");
                        }
                    }
                }
            });

            if (filterType === "checkboxes") {
                container.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((checkboxElement) => {
                    checkboxElement.addEventListener("click", () => {
                        if (objectHasKey(currentTab.filterData.checkboxes, filterName)) {
                            const optionName = checkboxElement.name;
                            const checkbox = currentTab.filterData.checkboxes[filterName];
                            const option = checkbox.options[optionName];
                            option.selected = !option.selected;
                            option.selected
                                ? checkbox.selected.push(optionName)
                                : (checkbox.selected = checkbox.selected.filter((name) => name !== optionName));
                            this.clearScrollLimit(true);
                        }
                    });
                });
            }

            if (filterType === "ranges") {
                container.querySelectorAll<HTMLInputElement>("input[name*=Bound]").forEach((range) => {
                    range.addEventListener("keyup", (event) => {
                        if (event.key !== "Enter") return;
                        const ranges = currentTab.filterData.ranges;
                        if (ranges && objectHasKey(ranges, filterName)) {
                            const range = ranges[filterName];
                            const lowerBound =
                                container.querySelector<HTMLInputElement>("input[name*=lowerBound]")?.value ?? "";
                            const upperBound =
                                container.querySelector<HTMLInputElement>("input[name*=upperBound]")?.value ?? "";
                            const values = currentTab.parseRangeFilterInput(filterName, lowerBound, upperBound);
                            range.values = values;
                            range.changed = true;
                            this.clearScrollLimit(true);
                        }
                    });
                });
            }

            if (filterType === "multiselects") {
                // Multiselects using tagify
                const multiselects = currentTab.filterData.multiselects;
                if (!multiselects) continue;
                if (objectHasKey(multiselects, filterName)) {
                    const multiselect = container.querySelector<HTMLInputElement>(
                        `input[name=${filterName}][data-tagify-select]`
                    );
                    if (!multiselect) continue;
                    const data = multiselects[filterName];

                    new Tagify(multiselect, {
                        enforceWhitelist: true,
                        keepInvalidTags: false,
                        editTags: false,
                        tagTextProp: "label",
                        dropdown: {
                            enabled: 0,
                            fuzzySearch: false,
                            mapValueTo: "label",
                            maxItems: data.options.length,
                            searchKeys: ["label"],
                        },
                        whitelist: data.options,
                    });

                    multiselect.addEventListener("change", () => {
                        const selections: unknown = JSON.parse(multiselect.value || "[]");
                        const isValid =
                            Array.isArray(selections) &&
                            selections.every(
                                (s: unknown): s is { value: string; label: string } =>
                                    isObject<{ value: unknown }>(s) && typeof s["value"] === "string"
                            );

                        if (isValid) {
                            data.selected = selections;
                            this.render();
                        }
                    });
                }
            }

            if (filterType === "sliders") {
                // Slider filters
                const sliders = currentTab.filterData.sliders;
                if (!sliders) continue;

                if (objectHasKey(sliders, filterName)) {
                    const sliderElement = container.querySelector<HTMLDivElement>(`div.slider-${filterName}`);
                    if (!sliderElement) continue;
                    const data = sliders[filterName];

                    const slider = noUiSlider.create(sliderElement, {
                        range: {
                            min: data.values.lowerLimit,
                            max: data.values.upperLimit,
                        },
                        start: [data.values.min, data.values.max],
                        tooltips: {
                            to(value: number) {
                                return Math.floor(value).toString();
                            },
                        },
                        connect: [false, true, false],
                        behaviour: "snap",
                        step: data.values.step,
                    });

                    slider.on("change", (values) => {
                        const [min, max] = values.map((value) => Number(value));
                        data.values.min = min;
                        data.values.max = max;

                        const $minLabel = $html.find(`label.${name}-min-label`);
                        const $maxLabel = $html.find(`label.${name}-max-label`);
                        $minLabel.text(min);
                        $maxLabel.text(max);

                        this.clearScrollLimit(true);
                    });

                    // Set styling
                    sliderElement.querySelectorAll<HTMLDivElement>(".noUi-handle").forEach((element) => {
                        element.classList.add("handle");
                    });
                    sliderElement.querySelectorAll<HTMLDivElement>(".noUi-connect").forEach((element) => {
                        element.classList.add("range_selected");
                    });
                }
            }
        }

        const list = html.querySelector<HTMLUListElement>(".tab.active ul.item-list");
        if (!list) return;
        list.addEventListener("scroll", () => {
            if (list.scrollTop + list.clientHeight >= list.scrollHeight - 5) {
                const currentValue = currentTab.scrollLimit;
                const maxValue = currentTab.totalItemCount ?? 0;
                if (currentValue < maxValue) {
                    currentTab.scrollLimit = Math.clamped(currentValue + 100, 100, maxValue);
                    this.renderResultList({ list, start: currentValue });
                }
            }
        });

        // Initial result list render
        this.renderResultList({ list });
    }

    /**
     * Append new results to the result list
     * @param options Render options
     * @param options.list The result list HTML element
     * @param options.start The index position to start from
     * @param options.replace Replace the current list with the new results?
     */
    private async renderResultList({ list, start = 0, replace = false }: RenderResultListOptions): Promise<void> {
        const currentTab = this.activeTab !== "settings" ? this.tabs[this.activeTab] : null;
        const html = this.element[0];
        if (!currentTab) return;

        if (!list) {
            const listElement = html.querySelector<HTMLUListElement>(".tab.active ul.item-list");
            if (!listElement) return;
            list = listElement;
        }

        // Get new results from index
        const newResults = await currentTab.renderResults(start);
        // Add listeners to new results only
        this.activateResultListeners(newResults);
        // Add the results to the DOM
        const fragment = document.createDocumentFragment();
        fragment.append(...newResults);
        if (replace) {
            list.replaceChildren(fragment);
        } else {
            list.append(fragment);
        }
        // Re-apply drag drop handler
        for (const dragDropHandler of this._dragDrop) {
            dragDropHandler.bind(html);
        }
    }

    /** Activate click listeners on loaded actors and items */
    private activateResultListeners(liElements: HTMLLIElement[] = []): void {
        for (const liElement of liElements) {
            const { entryUuid } = liElement.dataset;
            if (!entryUuid) continue;

            const nameAnchor = liElement.querySelector<HTMLAnchorElement>("div.name > a");
            if (nameAnchor) {
                nameAnchor.addEventListener("click", async () => {
                    const document = await fromUuid(entryUuid);
                    if (document?.sheet) {
                        document.sheet.render(true);
                    }
                });
            }

            if (this.activeTab === "equipment") {
                // Add an item to selected tokens' actors' inventories
                liElement
                    .querySelector<HTMLAnchorElement>("a[data-action=take-item]")
                    ?.addEventListener("click", () => {
                        this.takePhysicalItem(entryUuid);
                    });

                // Attempt to buy an item with the selected tokens' actors'
                liElement.querySelector<HTMLAnchorElement>("a[data-action=buy-item]")?.addEventListener("click", () => {
                    this.buyPhysicalItem(entryUuid);
                });
            }
        }
    }

    private async takePhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedOrOwnActors(["character", "npc"]);
        const item = await this.getPhysicalItem(uuid);

        if (actors.length === 0) {
            ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
            return;
        }

        for (const actor of actors) {
            await actor.createEmbeddedDocuments("Item", [item.toObject()]);
        }

        if (actors.length === 1 && game.user.character && actors[0] === game.user.character) {
            ui.notifications.info(
                game.i18n.format("PF2E.CompendiumBrowser.AddedItemToCharacter", {
                    item: item.name,
                    character: game.user.character.name,
                })
            );
        } else {
            ui.notifications.info(game.i18n.format("PF2E.CompendiumBrowser.AddedItem", { item: item.name }));
        }
    }

    private async buyPhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedOrOwnActors(["character", "npc"]);
        const item = await this.getPhysicalItem(uuid);

        if (actors.length === 0) {
            ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
            return;
        }

        let purchasesSucceeded = 0;

        for (const actor of actors) {
            if (await actor.inventory.removeCoins(item.price.value)) {
                purchasesSucceeded = purchasesSucceeded + 1;
                await actor.createEmbeddedDocuments("Item", [item.toObject()]);
            }
        }

        if (actors.length === 1) {
            if (purchasesSucceeded === 1) {
                ui.notifications.info(
                    game.i18n.format("PF2E.CompendiumBrowser.BoughtItemWithCharacter", {
                        item: item.name,
                        character: actors[0].name,
                    })
                );
            } else {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CompendiumBrowser.FailedToBuyItemWithCharacter", {
                        item: item.name,
                        character: actors[0].name,
                    })
                );
            }
        } else {
            if (purchasesSucceeded === actors.length) {
                ui.notifications.info(
                    game.i18n.format("PF2E.CompendiumBrowser.BoughtItemWithAllCharacters", {
                        item: item.name,
                    })
                );
            } else {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CompendiumBrowser.FailedToBuyItemWithSomeCharacters", {
                        item: item.name,
                    })
                );
            }
        }
    }

    private async getPhysicalItem(uuid: string): Promise<PhysicalItemPF2e | KitPF2e> {
        const item = await fromUuid(uuid);
        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) {
            throw ErrorPF2e("Unexpected failure retrieving compendium item");
        }

        return item;
    }

    protected override _canDragStart() {
        return true;
    }

    protected override _canDragDrop() {
        return true;
    }

    /** Set drag data and lower opacity of the application window to reveal any tokens */
    protected override _onDragStart(event: ElementDragEvent): void {
        this.element.animate({ opacity: 0.125 }, 250);

        const item = $(event.currentTarget)[0];
        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: item.dataset.type,
                uuid: item.dataset.entryUuid,
            })
        );
        item.addEventListener(
            "dragend",
            () => {
                window.setTimeout(() => {
                    this.element.animate({ opacity: 1 }, 250, () => {
                        this.element.css({ pointerEvents: "" });
                    });
                }, 500);
            },
            { once: true }
        );
    }

    protected override _onDragOver(event: ElementDragEvent): void {
        super._onDragOver(event);
        this.element.css({ pointerEvents: "none" });
    }

    injectActorDirectory() {
        const $html = ui.actors.element;
        if ($html.find(".bestiary-browser-btn").length > 0) return;

        // Bestiary Browser Buttons
        const bestiaryImportButton = $(
            `<button class="bestiary-browser-btn"><i class="fas fa-fire"></i> ${game.i18n.localize(
                "PF2E.CompendiumBrowser.BestiaryBrowser"
            )}</button>`
        );

        if (game.user.isGM) {
            $html.find("footer").append(bestiaryImportButton);
        }

        // Handle button clicks
        bestiaryImportButton.on("click", (ev) => {
            ev.preventDefault();
            this.openTab("bestiary");
        });
    }

    override getData() {
        const activeTab = this.activeTab;
        // Settings
        if (activeTab === "settings") {
            return {
                user: game.user,
                settings: this.settings,
            };
        }
        // Active tab
        const tab = this.tabs[activeTab];
        if (tab) {
            return {
                user: game.user,
                [activeTab]: {
                    filterData: tab.filterData,
                },
                scrollLimit: tab.scrollLimit,
            };
        }
        // No active tab
        return {
            user: game.user,
        };
    }

    private resetFilters(): void {
        const activeTab = this.activeTab;
        if (activeTab !== "settings") {
            this.tabs[activeTab].resetFilters();
        }
    }

    private clearScrollLimit(render = false) {
        const tab = this.activeTab;
        if (tab === "settings") return;

        const list = this.element[0].querySelector<HTMLUListElement>(".tab.active ul.item-list");
        if (!list) return;
        list.scrollTop = 0;
        this.tabs[tab].scrollLimit = 100;

        if (render) {
            this.render();
        }
    }
}

type CompendiumBrowserSettings = Omit<TabData<Record<string, PackInfo | undefined>>, "settings">;

export { CompendiumBrowser, CompendiumBrowserSettings };
