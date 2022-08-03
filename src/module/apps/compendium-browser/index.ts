import { Progress } from "./progress";
import { PhysicalItemPF2e } from "@item/physical";
import { KitPF2e } from "@item/kit";
import { ErrorPF2e, isObject, objectHasKey } from "@util";
import { LocalizePF2e } from "@system/localize";
import { BrowserTab } from "./tabs";
import { TabData, PackInfo, TabName, TabType, SortDirection } from "./data";
import { CheckboxData, RangesData } from "./tabs/data";
import { getSelectedOrOwnActors } from "@util/token-actor-utils";
import noUiSlider from "nouislider";
import { SpellcastingEntryPF2e } from "@item";
import Tagify from "@yaireo/tagify";

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
            const actorArt = game.pf2e.system.moduleArt.get(`Compendium.${packName}.${record._id}`)?.actor;
            record.img = actorArt ?? record.img;
        }
    }
}

class CompendiumBrowser extends Application {
    settings!: CompendiumBrowserSettings;
    dataTabsList = ["action", "bestiary", "equipment", "feat", "hazard", "spell"] as const;
    tabs: Record<Exclude<TabName, "settings">, TabType>;
    packLoader = new PackLoader();
    activeTab!: TabName;
    navigationTab!: Tabs;

    /** An initial filter to be applied upon loading a tab */
    private initialFilter: string[] = [];
    private initialMaxLevel = 0;

    constructor(options = {}) {
        super(options);

        this.tabs = {
            action: new BrowserTab.Actions(this),
            bestiary: new BrowserTab.Bestiary(this),
            equipment: new BrowserTab.Equipment(this),
            feat: new BrowserTab.Feats(this),
            hazard: new BrowserTab.Hazards(this),
            spell: new BrowserTab.Spells(this),
        };

        this.loadSettings();
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
            template: "systems/pf2e/templates/compendium-browser/compendium-browser.html",
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
        this.initialFilter = [];
        this.initialMaxLevel = 0;
        await super.close(options);
    }

    private initCompendiumList(): void {
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

    loadSettings(): void {
        this.settings = game.settings.get("pf2e", "compendiumBrowserPacks");
    }

    hookTab(): void {
        this.navigationTab = this._tabs[0];
        const tabCallback = this.navigationTab.callback;
        this.navigationTab.callback = async (event: JQuery.TriggeredEvent | null, tabs: Tabs, active: TabName) => {
            tabCallback?.(event, tabs, active);
            await this.loadTab(active);
        };
    }

    async openTab(tab: TabName, filter: string[] = [], maxLevel = 0): Promise<void> {
        this.initialFilter = filter;
        this.initialMaxLevel = maxLevel;
        await this._render(true);
        this.initialFilter = filter; // Reapply in case of a double-render (need to track those down)
        this.initialMaxLevel = maxLevel;
        this.navigationTab.activate(tab, { triggerCallback: true });
    }

    async openSpellTab(entry: SpellcastingEntryPF2e, level?: number | null): Promise<void> {
        const filter: string[] = [];

        if (entry.isRitual || entry.isFocusPool) {
            filter.push("category-".concat(entry.system.prepared.value));
        }

        if (level || level === 0) {
            filter.push(level ? `level-${level}` : "category-cantrip");

            if (level > 0) {
                if (!entry.isPrepared) {
                    while (level > 1) {
                        level -= 1;
                        filter.push("level-".concat(level.toString()));
                    }
                }

                if (entry.isPrepared || entry.isSpontaneous || entry.isInnate) {
                    filter.push("category-spell");
                }
            }
        }

        if (entry.tradition && !entry.isFocusPool && !entry.isRitual) {
            filter.push("traditions-".concat(entry.system.tradition.value));
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

        // Initialize Tab if it is not already initialzed
        if (!this.tabs[tab]?.isInitialized) {
            await this.tabs[tab].init();
        }

        // Set filterData for this tab if intitial values were given
        if (this.initialFilter.length || this.initialMaxLevel) {
            const currentTab = this.tabs[tab];
            currentTab.resetFilters();
            for (const filter of this.initialFilter) {
                const [filterType, value] = filter.split("-");
                if (objectHasKey(currentTab.filterData.checkboxes, filterType)) {
                    const checkbox = currentTab.filterData.checkboxes[filterType];
                    const option = checkbox.options[value];
                    if (option) {
                        checkbox.isExpanded = true;
                        checkbox.selected.push(value);
                        option.selected = true;
                    } else {
                        console.warn(`Tab '${tab}' filter '${filterType}' has no option: '${value}'`);
                    }
                } else {
                    console.warn(`Tab '${tab}' has no filter '${filterType}'`);
                }
            }
            if (this.initialMaxLevel) {
                if (currentTab.filterData.sliders) {
                    const level = currentTab.filterData.sliders.level;
                    if (level) {
                        level.values.max = this.initialMaxLevel;
                    }
                }
            }
            this.initialFilter = [];
            this.initialMaxLevel = 0;
        }

        this.render(true);
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
                    await game.settings.set("pf2e", "compendiumBrowserPacks", JSON.stringify(this.settings));
                    this.loadSettings();
                    this.initCompendiumList();
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
            search.addEventListener("search", () => {
                currentTab.filterData.search.text = search.value;
                this.clearScrollLimit(true);
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
            container.querySelector<HTMLDivElement>("div.title")?.addEventListener("click", () => {
                if (filterType === "checkboxes" || filterType === "ranges" || filterType === "sliders") {
                    const filters = currentTab.filterData[filterType];
                    if (filters && objectHasKey(filters, filterName)) {
                        // This needs a type assertion because it resolves to never for some reason
                        const filter = filters[filterName] as CheckboxData | RangesData;
                        filter.isExpanded = !filter.isExpanded;
                        const dlElement = container.querySelector("dl");
                        if (dlElement) {
                            filter.isExpanded ? (dlElement.style.display = "") : (dlElement.style.display = "none");
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
                            closeOnSelect: false,
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
                    this.renderResultList(html, list, currentValue);
                }
            }
        });

        // Initial result list render
        this.renderResultList(html, list);
    }

    /**
     * Append new results to the result list
     * @param html The Compendium Browser app HTML
     * @param list The result list HTML element
     * @param start The index position to start from
     */
    private async renderResultList(html: HTMLElement, list: HTMLUListElement, start = 0): Promise<void> {
        const currentTab = this.activeTab !== "settings" ? this.tabs[this.activeTab] : null;
        if (!currentTab) return;

        // Get new results from index
        const newResults = await currentTab.renderResults(start);
        // Add listeners to new results only
        this.activateResultListeners(newResults);
        // Add the results to the DOM
        const fragment = document.createDocumentFragment();
        fragment.append(...newResults);
        list.append(fragment);
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

    private clearScrollLimit(render = true) {
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
