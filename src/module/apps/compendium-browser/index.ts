import { KitPF2e, PhysicalItemPF2e } from "@item";
import { AbilityTrait, ActionCategory } from "@item/ability/index.ts";
import { ActionType, ItemType } from "@item/base/data/index.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { BaseSpellcastingEntry } from "@item/spellcasting-entry/index.ts";
import type { UserPF2e } from "@module/user/document.ts";
import {
    ErrorPF2e,
    createHTMLElement,
    fontAwesomeIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    isObject,
    objectHasKey,
    setHasElement,
} from "@util";
import { getSelectedActors } from "@util/token-actor-utils.ts";
import Tagify from "@yaireo/tagify";
import noUiSlider from "nouislider";
import * as R from "remeda";
import type {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationHeaderControlsEntry,
    ApplicationRenderOptions,
} from "types/foundry/client-esm/applications/_types.ts";
import type {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "types/foundry/client-esm/applications/api/handlebars-application.ts";
import { BrowserTab, BrowserTabs, PackInfo, SourceInfo, TabData, TabName } from "./data.ts";
import { PackLoader } from "./loader.ts";
import { CompendiumBrowserSettingsApp } from "./settings.ts";
import type { CompendiumBrowserTab } from "./tabs/base.ts";
import {
    ActionFilters,
    BestiaryFilters,
    BrowserFilter,
    CheckboxData,
    EquipmentFilters,
    FeatFilters,
    HazardFilters,
    RangesInputData,
    RenderResultListOptions,
    SliderData,
    SpellFilters,
} from "./tabs/data.ts";
import * as browserTabs from "./tabs/index.ts";

const foundryApp = foundry.applications.api;

class CompendiumBrowser extends foundryApp.HandlebarsApplicationMixin(foundryApp.ApplicationV2) {
    settings: CompendiumBrowserSettings;
    dataTabsList = ["action", "bestiary", "campaignFeature", "equipment", "feat", "hazard", "spell"] as const;
    tabs: BrowserTabs;

    packLoader = new PackLoader();
    activeTab?: BrowserTab;

    constructor(options: Partial<ApplicationConfiguration> = {}) {
        super(options);

        this.settings = game.settings.get("pf2e", "compendiumBrowserPacks");
        this.tabs = {
            action: new browserTabs.Actions(this),
            bestiary: new browserTabs.Bestiary(this),
            campaignFeature: new browserTabs.CampaignFeatures(this),
            equipment: new browserTabs.Equipment(this),
            feat: new browserTabs.Feats(this),
            hazard: new browserTabs.Hazards(this),
            spell: new browserTabs.Spells(this),
        };

        this.initCompendiumList();
    }

    override get title(): string {
        return game.i18n.localize("PF2E.CompendiumBrowser.Title");
    }

    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        id: "compendium-browser",
        classes: ["compendium-browser"],
        position: {
            width: 800,
            height: 700,
        },
        window: {
            controls: [
                {
                    action: "openSettings",
                    icon: "fa-solid fa-cogs",
                    label: "PF2E.CompendiumBrowser.Settings.OpenSettings",
                },
                {
                    action: "addToRollTable",
                    icon: "fa-solid fa-list",
                    label: "PF2E.CompendiumBrowser.RollTable.AddLabel",
                },
                {
                    action: "createRollTable",
                    icon: "fa-solid fa-list",
                    label: "PF2E.CompendiumBrowser.RollTable.CreateLabel",
                },
            ],
            resizable: true,
        },
        actions: {
            addToRollTable: () => {
                const browser = game.pf2e.compendiumBrowser;
                if (!browser.activeTab) return;
                browser.toggleControls();
                browser.activeTab.addToRollTable();
            },
            createRollTable: () => {
                const browser = game.pf2e.compendiumBrowser;
                if (!browser.activeTab) return;
                browser.toggleControls();
                browser.activeTab.createRollTable();
            },
            openSettings: () => {
                game.pf2e.compendiumBrowser.toggleControls();
                new CompendiumBrowserSettingsApp().render(true);
            },
        },
    };

    static override PARTS: Record<string, HandlebarsTemplatePart> = {
        main: {
            template: "systems/pf2e/templates/compendium-browser/compendium-browser.hbs",
        },
        filters: {
            template: "systems/pf2e/templates/compendium-browser/filters.hbs",
            scrollable: [""],
        },
        resultList: {
            template: "systems/pf2e/templates/compendium-browser/partials/result-list.hbs",
            scrollable: [""],
        },
    };

    override tabGroups: Record<string, string> = {
        primary: "landing-page",
    };

    /** Reset initial filtering */
    override async close(options?: ApplicationClosingOptions): Promise<foundry.applications.api.ApplicationV2> {
        for (const tab of Object.values(this.tabs)) {
            tab.filterData.search.text = "";
        }
        return super.close(options);
    }

    override changeTab(
        tab: TabName | "landing-page",
        group: string,
        options: { event?: Event; navElement?: HTMLElement; force?: boolean; updatePosition?: boolean },
    ): void {
        (async () => {
            if (tab !== "landing-page" && tab !== this.activeTab?.tabName) {
                await this.loadTab(tab);
            }
            super.changeTab(tab, group, options);
        })();
    }

    protected override _getHeaderControls(): ApplicationHeaderControlsEntry[] {
        const controls = super._getHeaderControls();
        const gmControls = ["addToRollTable", "createRollTable", "openSettings"];
        for (const control of controls) {
            if (!game.user.isGM && gmControls.includes(control.action)) {
                control.visible = false;
            }
        }
        return controls;
    }

    protected override _onRender(context: CompendiumBrowserRenderContext, options: ApplicationRenderOptions): void {
        super._onRender(context, options);

        if (!this.activeTab && options.parts?.includes("main")) {
            // Remove unnecessary parts from landing page
            htmlQuery(this.element, "[data-application-part=filters]")?.remove();
            htmlQuery(this.element, "[data-application-part=resultList]")?.remove();
        }
    }

    protected override async _prepareContext(
        _options: ApplicationRenderOptions,
    ): Promise<CompendiumBrowserRenderContext> {
        return {
            activeTab: this.activeTab?.tabName ?? "landing-page",
            filterData: this.activeTab?.filterData,
            user: game.user,
        };
    }

    protected override async _preparePartContext(
        partId: string,
        context: CompendiumBrowserRenderContext,
    ): Promise<CompendiumBrowserRenderContext> {
        if (partId === "main") {
            context.showCampaign = game.settings.get("pf2e", "campaignType") !== "none";
            context.tabs = this.#getTabs(context.showCampaign);
        }
        return context;
    }

    #getTabs(showCampaign: boolean): CompendiumBrowserNavTab[] {
        const translations: Record<TabName, string> = {
            action: "PF2E.Item.Ability.Plural",
            bestiary: "PF2E.CompendiumBrowser.TabBestiary",
            campaignFeature: "PF2E.CompendiumBrowser.TabCampaign",
            equipment: "TYPES.Item.equipment",
            feat: "PF2E.CompendiumBrowser.TabFeat",
            hazard: "PF2E.Actor.Hazard.Plural",
            spell: "PF2E.Item.Spell.Plural",
        };
        const tabs: CompendiumBrowserNavTab[] = [];
        const activeTabName = this.activeTab?.tabName ?? "";
        for (const name of this.dataTabsList) {
            if (!showCampaign && name === "campaignFeature") continue;
            tabs.push({
                class: activeTabName === name ? "active" : "",
                group: "primary",
                label: translations[name],
                name,
            });
        }
        // Add landing page
        tabs.push({
            group: "primary",
            label: "",
            style: "display: none;",
            name: "landing-page",
        });
        return tabs;
    }

    initCompendiumList(): void {
        const settings: Omit<TabData<Record<string, PackInfo | undefined>>, "settings"> = {
            action: {},
            bestiary: {},
            campaignFeature: {},
            hazard: {},
            equipment: {},
            feat: {},
            spell: {},
        };

        // NPCs and Hazards are all loaded by default, other packs can be set here.
        const loadDefault: Record<string, boolean | undefined> = {
            bestiary: true,
            hazard: true,
            "pf2e.actionspf2e": true,
            "pf2e.familiar-abilities": true,
            "pf2e.equipment-srd": true,
            "pf2e.ancestryfeatures": true,
            "pf2e.classfeatures": true,
            "pf2e.feats-srd": true,
            "pf2e.spells-srd": true,
            "pf2e.kingmaker-features": true,
        };

        const browsableTypes = new Set([
            "action",
            "campaignFeature",
            "feat",
            "kit",
            "hazard",
            "npc",
            "spell",
            ...PHYSICAL_ITEM_TYPES,
        ] as const);
        type BrowsableType = SetElement<typeof browsableTypes>;
        const typeToTab = new Map<ItemType | "hazard" | "npc", Exclude<TabName, "settings">>([
            ["action", "action"],
            ["campaignFeature", "campaignFeature"],
            ["feat", "feat"],
            ["kit", "equipment"],
            ["hazard", "hazard"],
            ["npc", "bestiary"],
            ["spell", "spell"],
            ...Array.from(PHYSICAL_ITEM_TYPES).map((t): [ItemType, "equipment"] => [t, "equipment"]),
        ]);

        for (const pack of game.packs) {
            const tabNames = R.unique(
                R.unique(pack.index.map((entry) => entry.type))
                    .filter((t): t is BrowsableType => setHasElement(browsableTypes, t))
                    .flatMap((t) => typeToTab.get(t) ?? []),
            );

            for (const tabName of tabNames) {
                const load =
                    this.settings[tabName]?.[pack.collection]?.load ??
                    loadDefault[tabName] ??
                    !!loadDefault[pack.collection];
                settings[tabName]![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                    package: pack.metadata.packageName,
                };
            }
        }

        for (const tab of this.dataTabsList) {
            settings[tab] = Object.fromEntries(
                Object.entries(settings[tab]!).sort(([_collectionA, dataA], [_collectionB, dataB]) => {
                    return (dataA?.name ?? "") > (dataB?.name ?? "") ? 1 : -1;
                }),
            );
        }

        this.settings = settings;
    }

    openTab(name: "action", filter?: ActionFilters): Promise<void>;
    openTab(name: "bestiary", filter?: BestiaryFilters): Promise<void>;
    openTab(name: "equipment", filter?: EquipmentFilters): Promise<void>;
    openTab(name: "feat", filter?: FeatFilters): Promise<void>;
    openTab(name: "hazard", filter?: HazardFilters): Promise<void>;
    openTab(name: "spell", filter?: SpellFilters): Promise<void>;
    async openTab(tabName: TabName, filter?: BrowserFilter): Promise<void> {
        if (!this.dataTabsList.includes(tabName)) {
            throw ErrorPF2e(`Unknown tab "${tabName}"`);
        }
        return this.loadTab(tabName, filter);
    }

    async openActionTab(options: {
        types?: ActionType[];
        categories?: ActionCategory[];
        traits?: AbilityTrait[];
    }): Promise<void> {
        const actionTab = this.tabs.action;
        const filter = await actionTab.getFilterData();
        const types = filter.checkboxes.types;
        const traits = filter.multiselects.traits;

        types.selected = [];
        for (const type in types.options) {
            if (options.types?.includes(type as ActionType)) {
                types.options[type].selected = true;
                types.selected.push(type);
            }
        }

        const traitFilters = options.traits ?? [];
        traits.selected = traitFilters.length
            ? traits.options.filter((trait) => traitFilters.includes(trait.value))
            : [];

        if (options.categories?.length) {
            const optionsToSwitch = R.pick(filter.checkboxes.category.options, options.categories);
            Object.values(optionsToSwitch).forEach((o) => (o.selected = true));
            filter.checkboxes.category.selected = Object.keys(optionsToSwitch);
        }

        actionTab.open(filter);
    }

    async openSpellTab(entry: BaseSpellcastingEntry, maxRank = 10, category: string | null = null): Promise<void> {
        const spellTab = this.tabs.spell;
        const filter = await spellTab.getFilterData();
        const traditions = filter.checkboxes.traditions;

        if (category && filter.checkboxes.category.options[category]) {
            filter.checkboxes.category.options[category].selected = true;
            filter.checkboxes.category.selected.push(category);
        }

        if (entry.isRitual || entry.isFocusPool) {
            filter.checkboxes.category.options[entry.category].selected = true;
            filter.checkboxes.category.selected.push(entry.category);
        }

        if (maxRank) {
            const ranks = Array.from(Array(maxRank).keys()).map((l) => String(l + 1));
            for (const rank of ranks) {
                filter.checkboxes.rank.options[rank].selected = true;
                filter.checkboxes.rank.selected.push(rank);
            }
            if ((entry.isPrepared || entry.isSpontaneous || entry.isInnate) && !category) {
                filter.checkboxes.category.options["spell"].selected = true;
                filter.checkboxes.category.selected.push("spell");
            }
        }

        if (entry.tradition && !entry.isFocusPool && !entry.isRitual) {
            traditions.options[entry.tradition].selected = true;
            traditions.selected.push(entry.tradition);
        }

        spellTab.open(filter);
    }

    async loadTab(tabName: TabName, filter?: BrowserFilter): Promise<void> {
        if (!this.dataTabsList.includes(tabName)) {
            throw ErrorPF2e(`Unknown tab "${tabName}"`);
        }

        this.activeTab = this.tabs[tabName];
        if (!this.activeTab.isInitialized) {
            await this.activeTab.init();
        }
        if (filter) {
            this.activeTab.filterData = filter;
        }

        await this.render({ force: true });
    }

    loadedPacks(tab: TabName): string[] {
        return Object.entries(this.settings[tab] ?? []).flatMap(([collection, info]) => {
            return info?.load ? [collection] : [];
        });
    }

    loadedPacksAll(): string[] {
        return R.unique(this.dataTabsList.flatMap((t) => this.loadedPacks(t))).sort();
    }

    protected override _attachPartListeners(partId: string, html: HTMLElement, options: HandlebarsRenderOptions): void {
        super._attachPartListeners(partId, html, options);

        switch (partId) {
            case "filters":
                return this._attachFilterListeners(html);
            case "resultList":
                return this._attachResultListListener(html);
        }
    }

    _attachResultListListener(list: HTMLElement): void {
        if (!this.activeTab) return;
        const currentTab = this.activeTab;

        list.addEventListener("scroll", () => {
            if (list.scrollTop + list.clientHeight >= list.scrollHeight - 5) {
                const currentValue = currentTab.scrollLimit;
                const maxValue = currentTab.totalItemCount ?? 0;
                if (currentValue < maxValue) {
                    currentTab.scrollLimit = Math.clamp(currentValue + 100, 100, maxValue);
                    this.#renderResultList({ list: list as HTMLUListElement, start: currentValue });
                }
            }
        });

        list.addEventListener("dragstart", (event) => {
            event.stopPropagation();
            const liElement = htmlClosest(event.target, "li");
            if (!liElement) return;
            event.dataTransfer?.setDragImage(liElement, 0, 0);
            this._onDragStart(event, liElement);
        });

        list.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const uuid = htmlClosest(target, "li[data-entry-uuid]")?.dataset.entryUuid;
            if (!uuid) return;
            const action = target.dataset.action;

            if (target.classList.contains("actor-link") || target.classList.contains("item-link")) {
                (await fromUuid(uuid))?.sheet.render(true);
            } else if (action === "take-item") {
                this.#takePhysicalItem(uuid);
            } else if (action === "buy-item") {
                this.#buyPhysicalItem(uuid);
            }
        });

        this.#renderResultList({ list: list as HTMLUListElement });
    }

    _attachFilterListeners(controlArea: HTMLElement): void {
        if (!this.activeTab) return;
        const currentTab = this.activeTab;
        const activeTabName = this.activeTab.tabName;

        // Search field
        const search = htmlQuery<HTMLInputElement>(controlArea, "input[name=textFilter]");
        if (search) {
            search.addEventListener("input", () => {
                currentTab.filterData.search.text = search.value;
                this.#resetView();
                this.#renderResultList({ replace: true });
            });
        }

        // Sort item list
        const sortContainer = htmlQuery(controlArea, "div.sortcontainer");
        if (sortContainer) {
            const order = htmlQuery<HTMLSelectElement>(sortContainer, "select.order");
            if (order) {
                order.addEventListener("change", () => {
                    currentTab.filterData.order.by = order.value ?? "name";
                    this.#resetView(["filters"]);
                });
            }
            const directionAnchor = htmlQuery(sortContainer, "a.direction");
            if (directionAnchor) {
                directionAnchor.addEventListener("click", () => {
                    const direction = directionAnchor.dataset.direction ?? "asc";
                    currentTab.filterData.order.direction = direction === "asc" ? "desc" : "asc";
                    this.#resetView(["filters"]);
                });
            }
        }

        if (activeTabName === "spell") {
            const timeFilter = htmlQuery<HTMLSelectElement>(controlArea, "select[name=timefilter]");
            if (timeFilter) {
                timeFilter.addEventListener("change", () => {
                    if (!currentTab.isOfType("spell")) return;
                    const filterData = currentTab.filterData;
                    if (!filterData.selects?.timefilter) return;
                    filterData.selects.timefilter.selected = timeFilter.value;
                    this.#resetView(["filters"]);
                });
            }
        }

        // Clear all filters button
        htmlQuery(controlArea, "button.clear-filters")?.addEventListener("click", () => {
            this.#resetFilters();
            this.#resetView(["filters"]);
        });

        // Filters
        for (const container of htmlQueryAll(controlArea, "div.filtercontainer")) {
            const { filterType, filterName } = container.dataset;
            // Clear this filter button
            htmlQuery(container, "button[data-action=clear-filter]")?.addEventListener("click", (event) => {
                event.stopImmediatePropagation();
                switch (filterType) {
                    case "checkboxes": {
                        const checkboxes = currentTab.filterData.checkboxes;
                        if (objectHasKey(checkboxes, filterName)) {
                            for (const option of Object.values(checkboxes[filterName].options)) {
                                option.selected = false;
                            }
                            checkboxes[filterName].selected = [];
                            this.#resetView(["filters"]);
                        }
                        break;
                    }
                    case "ranges": {
                        if (currentTab.isOfType("equipment")) {
                            const ranges = currentTab.filterData.ranges;
                            if (objectHasKey(ranges, filterName)) {
                                ranges[filterName].values = currentTab.defaultFilterData.ranges[filterName].values;
                                ranges[filterName].changed = false;
                                this.#resetView(["filters"]);
                            }
                        }
                    }
                }
            });

            // Toggle visibility of filter container
            const title = htmlQuery(container, "div.title");
            title?.addEventListener("click", () => {
                const toggleFilter = (filter: CheckboxData | RangesInputData | SliderData) => {
                    filter.isExpanded = !filter.isExpanded;
                    const contentElement = title.nextElementSibling;
                    if (contentElement instanceof HTMLElement) {
                        contentElement.style.display = filter.isExpanded ? "" : "none";
                    }
                };
                switch (filterType) {
                    case "checkboxes": {
                        if (objectHasKey(currentTab.filterData.checkboxes, filterName)) {
                            toggleFilter(currentTab.filterData.checkboxes[filterName]);
                        }
                        break;
                    }
                    case "ranges": {
                        if (!currentTab.isOfType("equipment")) return;
                        if (objectHasKey(currentTab.filterData.ranges, filterName)) {
                            toggleFilter(currentTab.filterData.ranges[filterName]);
                        }
                        break;
                    }
                    case "sliders": {
                        if (!currentTab.isOfType("bestiary", "equipment", "feat", "campaignFeature", "hazard")) return;
                        if (objectHasKey(currentTab.filterData.sliders, filterName)) {
                            toggleFilter(currentTab.filterData.sliders[filterName]);
                        }
                        break;
                    }
                }
            });

            if (filterType === "checkboxes") {
                for (const checkboxElement of htmlQueryAll<HTMLInputElement>(container, "input[type=checkbox]")) {
                    checkboxElement.addEventListener("click", () => {
                        if (objectHasKey(currentTab.filterData.checkboxes, filterName)) {
                            const optionName = checkboxElement.name;
                            const checkbox = currentTab.filterData.checkboxes[filterName];
                            const option = checkbox.options[optionName];
                            option.selected = !option.selected;
                            if (option.selected) {
                                checkbox.selected.push(optionName);
                            } else {
                                checkbox.selected = checkbox.selected.filter((name) => name !== optionName);
                            }
                            this.#resetView(["filters"]);
                        }
                    });
                }
            }

            if (filterType === "ranges") {
                for (const range of htmlQueryAll<HTMLInputElement>(container, "input[name*=Bound]")) {
                    range.addEventListener("keyup", (event) => {
                        if (!currentTab.isOfType("equipment")) return;
                        if (event.key !== "Enter") return;
                        const ranges = currentTab.filterData.ranges;
                        if (ranges && objectHasKey(ranges, filterName)) {
                            const range = ranges[filterName];
                            const lowerBound =
                                htmlQuery<HTMLInputElement>(container, "input[name*=lowerBound]")?.value ?? "";
                            const upperBound =
                                htmlQuery<HTMLInputElement>(container, "input[name*=upperBound]")?.value ?? "";
                            const values = currentTab.parseRangeFilterInput(filterName, lowerBound, upperBound);
                            range.values = values;
                            range.changed = true;
                            this.#resetView(["filters"]);
                        }
                    });
                }
            }

            if (filterType === "multiselects") {
                // Multiselects using tagify
                const multiselects = currentTab.filterData.multiselects;
                if (!multiselects) continue;
                if (objectHasKey(multiselects, filterName)) {
                    const multiselect = htmlQuery<HTMLInputElement>(
                        container,
                        `input[name=${filterName}][data-tagify-select]`,
                    );
                    if (!multiselect) continue;
                    const data = multiselects[filterName];

                    const tagify = new Tagify(multiselect, {
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
                        transformTag(tagData) {
                            const selected = data.selected.find((s) => s.value === tagData.value);
                            if (selected?.not) {
                                (tagData as unknown as { class: string }).class = "conjunction-not";
                            }
                        },
                    });

                    tagify.on("click", (event) => {
                        const target = event.detail.event.target;
                        if (!(target instanceof HTMLElement)) return;
                        const action = htmlClosest(target, "[data-action]")?.dataset?.action;
                        if (action === "toggle-not") {
                            const value = event.detail.data.value;
                            const selected = data.selected.find((s) => s.value === value);
                            if (selected) {
                                selected.not = !selected.not;
                                this.#resetView(["filters"]);
                            }
                        }
                    });
                    tagify.on("change", (event) => {
                        const selections: unknown = JSON.parse(event.detail.value || "[]");
                        const isValid =
                            Array.isArray(selections) &&
                            selections.every(
                                (s: unknown): s is { value: string; label: string } =>
                                    isObject<{ value: unknown }>(s) && typeof s["value"] === "string",
                            );

                        if (isValid) {
                            data.selected = selections;
                            this.#resetView(["filters"]);
                        }
                    });

                    for (const element of htmlQueryAll<HTMLInputElement>(
                        container,
                        `input[name=${filterName}-filter-conjunction]`,
                    )) {
                        element.addEventListener("change", () => {
                            const value = element.value;
                            if (value === "and" || value === "or") {
                                data.conjunction = value;
                                this.#resetView(["filters"]);
                            }
                        });
                    }

                    for (const tag of htmlQueryAll(container, "tag")) {
                        const icon = fontAwesomeIcon("ban", { style: "solid" });
                        icon.classList.add("fa-2xs");
                        const notButton = createHTMLElement("a", {
                            classes: ["conjunction-not-button"],
                            children: [icon],
                            dataset: { action: "toggle-not" },
                        });
                        tag.appendChild(notButton);
                    }
                }
            }

            if (filterType === "sliders") {
                // Slider filters
                if (!currentTab.isOfType("bestiary", "campaignFeature", "equipment", "feat", "hazard")) continue;
                const sliders = currentTab.filterData.sliders;
                if (!sliders) continue;

                if (objectHasKey(sliders, filterName)) {
                    const sliderElement = htmlQuery(container, `div.slider-${filterName}`);
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

                        const minLabel = htmlQuery(controlArea, `label.${filterName}-min-label`);
                        const maxLabel = htmlQuery(controlArea, `label.${filterName}-max-label`);
                        if (minLabel && maxLabel) {
                            minLabel.innerText = String(min);
                            maxLabel.innerText = String(max);
                        }

                        this.#resetView(["filters"]);
                    });

                    // Set styling
                    for (const element of htmlQueryAll(sliderElement, ".noUi-handle")) {
                        element.classList.add("handle");
                    }
                    for (const element of htmlQueryAll(sliderElement, ".noUi-connect")) {
                        element.classList.add("range_selected");
                    }
                }
            }
        }
    }

    /**
     * Append new results to the result list
     * @param options Render options
     * @param options.list The result list HTML element
     * @param options.start The index position to start from
     * @param options.replace Replace the current list with the new results?
     */
    async #renderResultList({ list, start = 0, replace = false }: RenderResultListOptions): Promise<void> {
        const currentTab = this.activeTab ?? null;
        if (!currentTab) return;

        if (!list) {
            const listElement = htmlQuery<HTMLUListElement>(this.element, ".tab.active ul.item-list");
            if (!listElement) return;
            list = listElement;
        }

        // Get new results from index
        const newResults = await currentTab.renderResults(start);
        // Add the results to the DOM
        const fragment = document.createDocumentFragment();
        fragment.append(...newResults);
        if (replace) {
            list.replaceChildren(fragment);
        } else {
            list.append(fragment);
        }
    }

    async #takePhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedActors({ include: ["character", "loot", "npc", "party"], assignedFallback: true });
        const item = await this.#getPhysicalItem(uuid);

        if (actors.length === 0) {
            ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
            return;
        }

        for (const actor of actors) {
            await actor.inventory.add(item, { stack: true });
        }

        if (actors.length === 1 && game.user.character && actors[0] === game.user.character) {
            ui.notifications.info(
                game.i18n.format("PF2E.CompendiumBrowser.AddedItemToCharacter", {
                    item: item.name,
                    character: game.user.character.name,
                }),
            );
        } else {
            ui.notifications.info(game.i18n.format("PF2E.CompendiumBrowser.AddedItem", { item: item.name }));
        }
    }

    async #buyPhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedActors({ include: ["character", "loot", "npc"], assignedFallback: true });
        const item = await this.#getPhysicalItem(uuid);

        if (actors.length === 0) {
            if (game.user.character?.isOfType("character")) {
                actors.push(game.user.character);
            } else {
                ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
                return;
            }
        }

        let purchaseSuccesses = 0;

        for (const actor of actors) {
            if (await actor.inventory.removeCoins(item.price.value)) {
                purchaseSuccesses = purchaseSuccesses + 1;
                await actor.inventory.add(item, { stack: true });
            }
        }

        if (actors.length === 1) {
            if (purchaseSuccesses === 1) {
                ui.notifications.info(
                    game.i18n.format("PF2E.CompendiumBrowser.BoughtItemWithCharacter", {
                        item: item.name,
                        character: actors[0].name,
                    }),
                );
            } else {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CompendiumBrowser.FailedToBuyItemWithCharacter", {
                        item: item.name,
                        character: actors[0].name,
                    }),
                );
            }
        } else {
            if (purchaseSuccesses === actors.length) {
                ui.notifications.info(
                    game.i18n.format("PF2E.CompendiumBrowser.BoughtItemWithAllCharacters", {
                        item: item.name,
                    }),
                );
            } else {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CompendiumBrowser.FailedToBuyItemWithSomeCharacters", {
                        item: item.name,
                    }),
                );
            }
        }
    }

    async #getPhysicalItem(uuid: string): Promise<PhysicalItemPF2e | KitPF2e> {
        const item = await fromUuid(uuid);
        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) {
            throw ErrorPF2e("Unexpected failure retrieving compendium item");
        }

        return item;
    }

    /** Set drag data and lower opacity of the application window to reveal any tokens */
    protected _onDragStart(event: DragEvent, item: HTMLLIElement): void {
        if (!event.dataTransfer) return;

        gsap.to(this.element, {
            duration: 0.25,
            opacity: 0.125,
            pointerEvents: "none",
        });

        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: item.dataset.type,
                uuid: item.dataset.entryUuid,
            }),
        );

        item.addEventListener(
            "dragend",
            () => {
                window.setTimeout(() => {
                    gsap.to(this.element, {
                        duration: 0.25,
                        opacity: 1,
                        pointerEvents: "",
                    });
                }, 500);
            },
            { once: true },
        );
    }

    async resetInitializedTabs(): Promise<void> {
        for (const tab of Object.values(this.tabs)) {
            if (tab.isInitialized) {
                await tab.init();
                tab.scrollLimit = 100;
            }
        }
        if (this.activeTab) {
            this.render({ parts: ["filters", "resultList"] });
        }
    }

    #resetFilters(): void {
        this.activeTab?.resetFilters();
    }

    #resetView(renderParts: string[] = []): void {
        const tab = this.activeTab;
        if (!tab) return;
        const list = htmlQuery<HTMLUListElement>(this.element, ".tab.active ul.item-list");
        if (!list) return;
        list.scrollTop = 0;
        tab.scrollLimit = 100;
        this.#renderResultList({ list, replace: true });
        if (renderParts.length > 0) {
            this.render({ parts: renderParts });
        }
    }
}

type CompendiumBrowserSettings = Omit<TabData<Record<string, PackInfo | undefined>>, "settings">;

type CompendiumBrowserSourcesList = Record<string, SourceInfo | undefined>;
interface CompendiumBrowserSources {
    ignoreAsGM: boolean;
    showEmptySources: boolean;
    showUnknownSources: boolean;
    sources: CompendiumBrowserSourcesList;
}

interface CompendiumBrowserRenderContext {
    activeTab: TabName | "landing-page";
    user: Active<UserPF2e>;
    filterData?: CompendiumBrowserTab["filterData"];
    showCampaign?: boolean;
    tabs?: CompendiumBrowserNavTab[];
}

interface CompendiumBrowserNavTab {
    class?: string;
    group: string;
    label: string;
    name: string;
    style?: string;
}

export { CompendiumBrowser };
export type { CompendiumBrowserSettings, CompendiumBrowserSources };
