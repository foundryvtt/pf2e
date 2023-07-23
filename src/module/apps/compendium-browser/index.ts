import { KitPF2e, PhysicalItemPF2e } from "@item";
import { ActionCategory, ActionTrait } from "@item/action/index.ts";
import { ActionType } from "@item/data/base.ts";
import { BaseSpellcastingEntry } from "@item/spellcasting-entry/index.ts";
import { UserPF2e } from "@module/user/document.ts";
import { ErrorPF2e, htmlQuery, htmlQueryAll, isBlank, isObject, localizer, objectHasKey, sluggify } from "@util";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";
import Tagify from "@yaireo/tagify";
import noUiSlider from "nouislider";
import * as R from "remeda";
import { Progress } from "../../system/progress.ts";
import { BrowserTabs, PackInfo, SortDirection, SourceInfo, TabData, TabName } from "./data.ts";
import {
    ActionFilters,
    BestiaryFilters,
    BrowserFilter,
    CheckboxData,
    EquipmentFilters,
    FeatFilters,
    HazardFilters,
    RangesData,
    RenderResultListOptions,
    SliderData,
    SpellFilters,
} from "./tabs/data.ts";
import * as browserTabs from "./tabs/index.ts";

class PackLoader {
    loadedPacks: {
        Actor: Record<string, { pack: CompendiumCollection; index: CompendiumIndex } | undefined>;
        Item: Record<string, { pack: CompendiumCollection; index: CompendiumIndex } | undefined>;
    } = { Actor: {}, Item: {} };

    loadedSources: string[] = [];
    sourcesSettings: CompendiumBrowserSources;

    constructor() {
        this.sourcesSettings = game.settings.get("pf2e", "compendiumBrowserSources");
    }

    async *loadPacks(
        documentType: "Actor" | "Item",
        packs: string[],
        indexFields: string[]
    ): AsyncGenerator<{ pack: CompendiumCollection<CompendiumDocument>; index: CompendiumIndex }, void, unknown> {
        this.loadedPacks[documentType] ??= {};
        const localize = localizer("PF2E.ProgressBar");
        const sources = this.#getSources();

        const progress = new Progress({ max: packs.length });
        for (const packId of packs) {
            let data = this.loadedPacks[documentType][packId];
            if (data) {
                const { pack } = data;
                progress.advance({ label: localize("LoadingPack", { pack: pack?.metadata.label ?? "" }) });
            } else {
                const pack = game.packs.get(packId);
                if (!pack) {
                    progress.advance();
                    continue;
                }
                progress.advance({ label: localize("LoadingPack", { pack: pack.metadata.label }) });
                if (pack.documentName === documentType) {
                    const index = await pack.getIndex({ fields: indexFields });
                    const firstResult: Partial<CompendiumIndexData> = index.contents.at(0) ?? {};
                    // Every result should have the "system" property otherwise the indexFields were wrong for that pack
                    if (firstResult.system) {
                        const filteredIndex = this.#createFilteredIndex(index, sources);
                        this.#setModuleArt(packId, filteredIndex);
                        data = { pack, index: filteredIndex };
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
        progress.close({ label: localize("LoadingComplete") });
    }

    /** Set art provided by a module if any is available */
    #setModuleArt(packName: string, index: CompendiumIndex): void {
        if (!packName.startsWith("pf2e.")) return;
        for (const record of index) {
            const uuid: CompendiumUUID = `Compendium.${packName}.${record._id}`;
            const actorArt = game.pf2e.system.moduleArt.map.get(uuid)?.img;
            record.img = actorArt ?? record.img;
        }
    }

    #getSources(): Set<string> {
        const sources = new Set<string>();
        for (const source of Object.values(this.sourcesSettings.sources)) {
            if (source?.load) {
                sources.add(source.name);
            }
        }
        return sources;
    }

    #createFilteredIndex(index: CompendiumIndex, sources: Set<string>): CompendiumIndex {
        if (sources.size === 0) {
            // Make sure everything works as before as long as the settings are not yet defined
            return index;
        }

        if (game.user.isGM && this.sourcesSettings.ignoreAsGM) {
            return index;
        }

        const filteredIndex: CompendiumIndex = new Collection<CompendiumIndexData>();
        const knownSources = Object.values(this.sourcesSettings.sources).map((value) => value?.name);

        for (const document of index) {
            const source = this.#getSourceFromDocument(document);
            const blank = isBlank(source);

            if (
                (blank && this.sourcesSettings.showEmptySources) ||
                sources.has(source) ||
                (this.sourcesSettings.showUnknownSources && !blank && !knownSources.includes(source))
            ) {
                filteredIndex.set(document._id, document);
            }
        }
        return filteredIndex;
    }

    async updateSources(packs: string[]): Promise<void> {
        await this.#loadSources(packs);

        for (const source of this.loadedSources) {
            const slug = sluggify(source);
            if (this.sourcesSettings.sources[slug] === undefined) {
                this.sourcesSettings.sources[slug] = {
                    load: this.sourcesSettings.showUnknownSources,
                    name: source,
                };
            }
        }

        // Make sure it can be easily displayed sorted
        this.sourcesSettings.sources = Object.fromEntries(
            Object.entries(this.sourcesSettings.sources).sort((a, b) => a[0].localeCompare(b[0], game.i18n.lang))
        );
    }

    async #loadSources(packs: string[]): Promise<void> {
        const localize = localizer("PF2E.ProgressBar");
        const progress = new Progress({ max: packs.length });

        const loadedSources = new Set<string>();
        const indexFields = ["system.details.source.value", "system.source.value"];
        const knownDocumentTypes = ["Actor", "Item"];

        for (const packId of packs) {
            const pack = game.packs.get(packId);
            if (!pack || !knownDocumentTypes.includes(pack.documentName)) {
                progress.advance();
                continue;
            }
            progress.advance({ label: localize("LoadingPack", { pack: pack?.metadata.label ?? "" }) });
            const index = await pack.getIndex({ fields: indexFields });

            for (const element of index) {
                const source = this.#getSourceFromDocument(element);
                if (source && source !== "") {
                    loadedSources.add(source);
                }
            }
        }

        progress.close({ label: localize("LoadingComplete") });
        const loadedSourcesArray = Array.from(loadedSources).sort();
        this.loadedSources = loadedSourcesArray;
    }

    #getSourceFromDocument(document: CompendiumIndexData): string {
        // There are two possible fields where the source can be, check them in order
        if (document.system?.details?.source?.value) {
            return document.system.details.source.value;
        }

        if (document.system?.source?.value) {
            return document.system.source.value;
        }

        return "";
    }

    reset(): void {
        this.loadedPacks = { Actor: {}, Item: {} };
        this.loadedSources = [];
    }

    async hardReset(packs: string[]): Promise<void> {
        this.reset();
        this.sourcesSettings = {
            ignoreAsGM: true,
            showEmptySources: true,
            showUnknownSources: true,
            sources: {},
        };
        await this.updateSources(packs);
    }
}

class CompendiumBrowser extends Application {
    settings: CompendiumBrowserSettings;
    dataTabsList = ["action", "bestiary", "equipment", "feat", "hazard", "spell"] as const;
    navigationTab: Tabs;
    tabs: BrowserTabs;

    packLoader = new PackLoader();
    declare activeTab: TabName;

    constructor(options = {}) {
        super(options);

        this.settings = game.settings.get("pf2e", "compendiumBrowserPacks");
        this.navigationTab = this.hookTab();
        this.tabs = {
            action: new browserTabs.Actions(this),
            bestiary: new browserTabs.Bestiary(this),
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

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
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
                {
                    navSelector: "nav[data-group=settings]",
                    contentSelector: ".settings-container",
                    initial: "packs",
                },
            ],
            scrollY: [".control-area", ".item-list", ".settings-container"],
        };
    }

    /** Reset initial filtering */
    override async close(options?: { force?: boolean }): Promise<void> {
        for (const tab of Object.values(this.tabs)) {
            tab.filterData.search.text = "";
        }
        await super.close(options);
    }

    hookTab(): Tabs {
        const navigationTab = this._tabs[0];
        const tabCallback = navigationTab.callback;
        navigationTab.callback = async (event: JQuery.TriggeredEvent | null, tabs: Tabs, active: TabName) => {
            tabCallback?.(event, tabs, active);
            await this.loadTab(active);
        };
        return navigationTab;
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
            "pf2e.familiar-abilities": true,
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
                    package: pack.metadata.packageName,
                };
            }
            if (types.has("hazard")) {
                const load = this.settings.hazard?.[pack.collection]?.load ?? true;
                settings.hazard![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                    package: pack.metadata.packageName,
                };
            }

            if (types.has("action")) {
                const load = this.settings.action?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.action![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                    package: pack.metadata.packageName,
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
                    package: pack.metadata.packageName,
                };
            } else if (types.has("feat")) {
                const load = this.settings.feat?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.feat![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                    package: pack.metadata.packageName,
                };
            } else if (types.has("spell")) {
                const load = this.settings.spell?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.spell![pack.collection] = {
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
                })
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
    openTab(name: "settings"): Promise<void>;
    async openTab(tabName: TabName, filter?: BrowserFilter): Promise<void> {
        this.activeTab = tabName;
        if (tabName !== "settings" && filter) {
            return this.tabs[tabName].open(filter);
        }
        return this.loadTab(tabName);
    }

    async openActionTab(options: {
        types?: ActionType[];
        categories?: ActionCategory[];
        traits?: ActionTrait[];
    }): Promise<void> {
        const actionTab = this.tabs.action;
        const filter = await actionTab.getFilterData();
        const { types } = filter.checkboxes;
        const { traits } = filter.multiselects;

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

    async openSpellTab(entry: BaseSpellcastingEntry, maxLevel = 10): Promise<void> {
        const spellTab = this.tabs.spell;
        const filter = await spellTab.getFilterData();
        const { category, level, traditions } = filter.checkboxes;

        if (entry.isRitual || entry.isFocusPool) {
            category.options[entry.category].selected = true;
            category.selected.push(entry.category);
        }

        if (maxLevel) {
            const levels = Array.from(Array(maxLevel).keys()).map((l) => String(l + 1));
            for (const l of levels) {
                level.options[l].selected = true;
                level.selected.push(l);
            }
            if (entry.isPrepared || entry.isSpontaneous || entry.isInnate) {
                category.options["spell"].selected = true;
                category.selected.push("spell");
            }
        }

        if (entry.tradition && !entry.isFocusPool && !entry.isRitual) {
            traditions.options[entry.tradition].selected = true;
            traditions.selected.push(entry.tradition);
        }

        spellTab.open(filter);
    }

    async loadTab(tabName: TabName): Promise<void> {
        this.activeTab = tabName;
        // Settings tab
        if (tabName === "settings") {
            await this.packLoader.updateSources(this.loadedPacksAll());
            await this.render(true);
            return;
        }

        if (!this.dataTabsList.includes(tabName)) {
            throw ErrorPF2e(`Unknown tab "${tabName}"`);
        }

        const currentTab = this.tabs[tabName];

        // Initialize Tab if it is not already initialzed
        if (!currentTab.isInitialized) {
            await currentTab.init();
        }

        await this.render(true, { focus: true });
    }

    loadedPacks(tab: TabName): string[] {
        if (tab === "settings") return [];
        return Object.entries(this.settings[tab] ?? []).flatMap(([collection, info]) => {
            return info?.load ? [collection] : [];
        });
    }

    loadedPacksAll(): string[] {
        const loadedPacks = new Set<string>();
        for (const tabName of this.dataTabsList) {
            this.loadedPacks(tabName).forEach((item) => loadedPacks.add(item));
        }
        return Array.from(loadedPacks).sort();
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];
        const activeTabName = this.activeTab;

        // Set the navigation tab. This is only needed when the browser is openend
        // with CompendiumBrowserTab#open
        if (this.navigationTab.active !== activeTabName) {
            this.navigationTab.activate(activeTabName);
        }

        // Settings Tab
        if (activeTabName === "settings") {
            const settings = htmlQuery(html, ".compendium-browser-settings");
            const form = settings?.querySelector<HTMLFormElement>("form");
            if (!form) return;

            htmlQuery(settings, "button[data-action=save-settings]")?.addEventListener("click", async () => {
                const formData = new FormData(form);
                for (const [t, packs] of Object.entries(this.settings) as [string, { [key: string]: PackInfo }][]) {
                    for (const [key, pack] of Object.entries(packs) as [string, PackInfo][]) {
                        pack.load = formData.has(`${t}-${key}`);
                    }
                }
                await game.settings.set("pf2e", "compendiumBrowserPacks", this.settings);

                for (const [key, source] of Object.entries(this.packLoader.sourcesSettings.sources)) {
                    if (!source || isBlank(source.name)) {
                        delete this.packLoader.sourcesSettings.sources[key]; // just to make sure we clean up
                        continue;
                    }
                    source.load = formData.has(`source-${key}`);
                }

                this.packLoader.sourcesSettings.showEmptySources = formData.has("show-empty-sources");
                this.packLoader.sourcesSettings.showUnknownSources = formData.has("show-unknown-sources");
                this.packLoader.sourcesSettings.ignoreAsGM = formData.has("ignore-as-gm");
                await game.settings.set("pf2e", "compendiumBrowserSources", this.packLoader.sourcesSettings);

                await this.#resetInitializedTabs();
                this.render(true);
                ui.notifications.info("PF2E.BrowserSettingsSaved", { localize: true });
            });

            const sourceSearch = htmlQuery<HTMLInputElement>(form, "input[data-element=setting-sources-search]");
            const sourceToggle = htmlQuery<HTMLInputElement>(form, "input[data-action=setting-sources-toggle-visible]");
            const sourceSettings = htmlQueryAll<HTMLElement>(form, "label[data-element=setting-source]");

            sourceSearch?.addEventListener("input", () => {
                const value = sourceSearch.value?.trim().toLocaleLowerCase(game.i18n.lang);

                for (const element of sourceSettings) {
                    const name = element.dataset.name?.toLocaleLowerCase(game.i18n.lang);
                    const shouldBeHidden = !isBlank(value) && !isBlank(name) && !name.includes(value);

                    element.classList.toggle("hidden", shouldBeHidden);
                }

                if (sourceToggle) {
                    sourceToggle.checked = false;
                }
            });

            sourceToggle?.addEventListener("click", () => {
                for (const element of sourceSettings) {
                    const checkbox = htmlQuery<HTMLInputElement>(element, "input[type=checkbox]");
                    if (!element.classList.contains("hidden") && checkbox) {
                        checkbox.checked = sourceToggle.checked;
                    }
                }
            });

            const deleteButton = htmlQuery<HTMLInputElement>(form, "button[data-action=settings-sources-delete]");
            deleteButton?.addEventListener("click", async () => {
                const localize = localizer("PF2E.SETTINGS.CompendiumBrowserSources");
                const confirm = await Dialog.confirm({
                    title: localize("DeleteAllTitle"),
                    content: `
                        <p>
                            ${localize("DeleteAllQuestion")}
                        </p>
                        <p>
                            ${localize("DeleteAllInfo")}
                        </p>
                        `,
                });

                if (confirm) {
                    await this.packLoader.hardReset(this.loadedPacksAll());
                    await game.settings.set("pf2e", "compendiumBrowserSources", this.packLoader.sourcesSettings);
                    await this.#resetInitializedTabs();
                    this.render(true);
                }
            });
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
                this.#clearScrollLimit();
                this.#renderResultList({ replace: true });
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
                    this.#clearScrollLimit(true);
                });
            }
            const directionAnchor = sortContainer.querySelector<HTMLAnchorElement>("a.direction");
            if (directionAnchor) {
                directionAnchor.addEventListener("click", () => {
                    const direction = (directionAnchor.dataset.direction as SortDirection) ?? "asc";
                    currentTab.filterData.order.direction = direction === "asc" ? "desc" : "asc";
                    this.#clearScrollLimit(true);
                });
            }
        }

        if (activeTabName === "spell") {
            const timeFilter = controlArea.querySelector<HTMLSelectElement>("select[name=timefilter]");
            if (timeFilter) {
                timeFilter.addEventListener("change", () => {
                    if (!currentTab.isOfType("spell")) return;
                    const filterData = currentTab.filterData;
                    if (!filterData.selects?.timefilter) return;
                    filterData.selects.timefilter.selected = timeFilter.value;
                    this.#clearScrollLimit(true);
                });
            }
        }

        // Clear all filters button
        controlArea.querySelector<HTMLButtonElement>("button.clear-filters")?.addEventListener("click", () => {
            this.#resetFilters();
            this.#clearScrollLimit(true);
        });

        // Create Roll Table button
        htmlQuery(html, "[data-action=create-roll-table]")?.addEventListener("click", () =>
            currentTab.createRollTable()
        );

        // Add to Roll Table button
        htmlQuery(html, "[data-action=add-to-roll-table]")?.addEventListener("click", async () => {
            if (!game.tables.contents.length) return;
            currentTab.addToRollTable();
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
                            if (currentTab.isOfType("equipment")) {
                                const ranges = currentTab.filterData.ranges;
                                if (objectHasKey(ranges, filterName)) {
                                    ranges[filterName].values = currentTab.defaultFilterData.ranges[filterName].values;
                                    ranges[filterName].changed = false;
                                    this.render(true);
                                }
                            }
                        }
                    }
                });

            // Toggle visibility of filter container
            const title = container.querySelector<HTMLDivElement>("div.title");
            title?.addEventListener("click", () => {
                const toggleFilter = (filter: CheckboxData | RangesData | SliderData) => {
                    filter.isExpanded = !filter.isExpanded;
                    const contentElement = title.nextElementSibling;
                    if (contentElement instanceof HTMLElement) {
                        filter.isExpanded
                            ? (contentElement.style.display = "")
                            : (contentElement.style.display = "none");
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
                        if (!currentTab.isOfType("bestiary", "equipment", "feat", "hazard")) return;
                        if (objectHasKey(currentTab.filterData.sliders, filterName)) {
                            toggleFilter(currentTab.filterData.sliders[filterName]);
                        }
                        break;
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
                            this.#clearScrollLimit(true);
                        }
                    });
                });
            }

            if (filterType === "ranges") {
                container.querySelectorAll<HTMLInputElement>("input[name*=Bound]").forEach((range) => {
                    range.addEventListener("keyup", (event) => {
                        if (!currentTab.isOfType("equipment")) return;
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
                            this.#clearScrollLimit(true);
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
                        const target = event.detail.event.target as HTMLElement;
                        if (!target) return;

                        const value = event.detail.data.value;
                        const selected = data.selected.find((s) => s.value === value);
                        if (selected) {
                            const current = !!selected.not;
                            selected.not = !current;
                            this.render();
                        }
                    });
                    tagify.on("change", (event) => {
                        const selections: unknown = JSON.parse(event.detail.value || "[]");
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

                    for (const element of htmlQueryAll<HTMLInputElement>(
                        container,
                        `input[name=${filterName}-filter-conjunction]`
                    )) {
                        element.addEventListener("change", () => {
                            const value = element.value;
                            if (value === "and" || value === "or") {
                                data.conjunction = value;
                                this.render();
                            }
                        });
                    }
                }
            }

            if (filterType === "sliders") {
                // Slider filters
                if (!currentTab.isOfType("bestiary", "equipment", "feat", "hazard")) return;
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

                        this.#clearScrollLimit(true);
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
                    this.#renderResultList({ list, start: currentValue });
                }
            }
        });

        // Initial result list render
        this.#renderResultList({ list });
    }

    async #resetInitializedTabs(): Promise<void> {
        for (const tab of Object.values(this.tabs)) {
            if (tab.isInitialized) {
                await tab.init();
                tab.scrollLimit = 100;
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
        this.#activateResultListeners(newResults);
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
    #activateResultListeners(liElements: HTMLLIElement[] = []): void {
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
                        this.#takePhysicalItem(entryUuid);
                    });

                // Attempt to buy an item with the selected tokens' actors'
                liElement.querySelector<HTMLAnchorElement>("a[data-action=buy-item]")?.addEventListener("click", () => {
                    this.#buyPhysicalItem(entryUuid);
                });
            }
        }
    }

    async #takePhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedOrOwnActors(["character", "npc"]);
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
                })
            );
        } else {
            ui.notifications.info(game.i18n.format("PF2E.CompendiumBrowser.AddedItem", { item: item.name }));
        }
    }

    async #buyPhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedOrOwnActors(["character", "npc"]);
        const item = await this.#getPhysicalItem(uuid);

        if (actors.length === 0) {
            ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
            return;
        }

        let purchasesSucceeded = 0;

        for (const actor of actors) {
            if (await actor.inventory.removeCoins(item.price.value)) {
                purchasesSucceeded = purchasesSucceeded + 1;
                await actor.inventory.add(item, { stack: true });
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

    async #getPhysicalItem(uuid: string): Promise<PhysicalItemPF2e | KitPF2e> {
        const item = await fromUuid(uuid);
        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) {
            throw ErrorPF2e("Unexpected failure retrieving compendium item");
        }

        return item;
    }

    protected override _canDragStart(): boolean {
        return true;
    }

    protected override _canDragDrop(): boolean {
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
        // awful hack (dataTransfer.types will include "from-browser")
        event.dataTransfer.setData("from-browser", "true");

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
        if (event.dataTransfer.types.includes("from-browser")) {
            this.element.css({ pointerEvents: "none" });
        }
    }

    override getData(): {
        user: Active<UserPF2e>;
        settings?: { settings: CompendiumBrowserSettings; sources: CompendiumBrowserSources };
        scrollLimit?: number;
    } {
        const activeTab = this.activeTab;
        // Settings
        if (activeTab === "settings") {
            const settings = {
                settings: this.settings,
                sources: this.packLoader.sourcesSettings,
            };

            return {
                user: game.user,
                settings: settings,
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

    #resetFilters(): void {
        const activeTab = this.activeTab;
        if (activeTab !== "settings") {
            this.tabs[activeTab].resetFilters();
        }
    }

    #clearScrollLimit(render = false): void {
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

type CompendiumBrowserSourcesList = Record<string, SourceInfo | undefined>;
interface CompendiumBrowserSources {
    ignoreAsGM: boolean;
    showEmptySources: boolean;
    showUnknownSources: boolean;
    sources: CompendiumBrowserSourcesList;
}

export { CompendiumBrowser, CompendiumBrowserSettings, CompendiumBrowserSources };
