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
                    // Every result should have the "data" property otherwise the indexFields were wrong for that pack
                    if (firstResult.data) {
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

export class CompendiumBrowser extends Application {
    settings!: Omit<TabData<Record<string, PackInfo | undefined>>, "settings">;
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

    override get title() {
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

    override async _render(force?: boolean, options?: RenderOptions) {
        await super._render(force, options);
        this.activateResultListeners();
    }

    /** Reset initial filtering */
    override async close(options?: { force?: boolean }): Promise<void> {
        this.initialFilter = [];
        this.initialMaxLevel = 0;
        await super.close(options);
    }

    private initCompendiumList() {
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

    loadSettings() {
        this.settings = JSON.parse(game.settings.get("pf2e", "compendiumBrowserPacks"));
    }

    hookTab() {
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

    async openSpellTab(entry: SpellcastingEntryPF2e, level?: number | null) {
        const filter: string[] = [];

        if (entry.isRitual || entry.isFocusPool) {
            filter.push("category-".concat(entry.data.data.prepared.value));
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
            filter.push("traditions-".concat(entry.data.data.tradition.value));
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
        const activeTabName = this.activeTab;
        const html = $html.get(0)!;

        // Settings Tab
        if (activeTabName === "settings") {
            $html.find<HTMLButtonElement>("button.save-settings").on("click", async () => {
                const formData = new FormData($html.find<HTMLFormElement>(".compendium-browser-settings form")[0]);
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
                        this.render(true);
                    }
                }
            });
            return;
        }
        // Other tabs
        const currentTab = this.tabs[activeTabName];
        const $controlArea = $html.find(".control-area");

        $controlArea.find("button.clear-filters").on("click", () => {
            this.resetFilters();
            this.clearScrollLimit();
            this.render(true);
        });

        $controlArea.find("button[data-action=clear-filter]").on("click", (event) => {
            event.stopImmediatePropagation();
            const filterType = event.currentTarget.parentElement?.parentElement?.dataset.filterType;
            const filterName = event.currentTarget.parentElement?.parentElement?.dataset.filterName ?? "";
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

        // Toggle visibility of filter containers
        $controlArea.find(".filtercontainer div.title").on("click", (event) => {
            const filterType = event.currentTarget.parentElement?.dataset.filterType;
            const filterName = event.currentTarget.parentElement?.dataset.filterName ?? "";
            if (filterType === "checkboxes" || filterType === "ranges" || filterType === "sliders") {
                const filters = currentTab.filterData[filterType];
                if (filters && objectHasKey(filters, filterName)) {
                    // This needs a type assertion because it resolves to never for some reason
                    const filter = filters[filterName] as CheckboxData | RangesData;
                    filter.isExpanded = !filter.isExpanded;
                    this.render(true);
                }
            }
        });

        // Sort item list
        const $sortContainer = $controlArea.find(".sortcontainer");
        const $orderSelects = $sortContainer.find<HTMLSelectElement>("select.order");
        const $directionButtons = $sortContainer.find("a.direction");
        $orderSelects.on("change", (event) => {
            const $order = $(event.target);
            const orderBy = $order.val()?.toString() ?? "name";
            currentTab.filterData.order.by = orderBy;
            this.clearScrollLimit();
            this.render(true);
        });

        $directionButtons.on("click", (event) => {
            const direction = ($(event.currentTarget).data("direction") as SortDirection) ?? "asc";
            currentTab.filterData.order.direction = direction === "asc" ? "desc" : "asc";
            this.clearScrollLimit();
            this.render(true);
        });

        // Search field
        $controlArea.find<HTMLInputElement>("input[name=textFilter]").on("change paste", (event) => {
            currentTab.filterData.search.text = event.target.value;
            this.clearScrollLimit();
            this.render(true);
        });

        // TODO: Support any generated select element
        $controlArea.find<HTMLSelectElement>(".timefilter select").on("change", (event) => {
            if (!currentTab.filterData?.selects?.timefilter) return;
            currentTab.filterData.selects.timefilter.selected = event.target.value;
            this.clearScrollLimit();
            this.render(true);
        });

        // Activate or deactivate filters
        $controlArea.find<HTMLInputElement>("input[type=checkbox]").on("click", (event) => {
            const checkboxName = event.target.closest("div")?.dataset?.filterName;
            const optionName = event.target.name;
            if (!checkboxName || !optionName) return;
            if (objectHasKey(currentTab.filterData.checkboxes, checkboxName)) {
                const checkbox = currentTab.filterData.checkboxes[checkboxName];
                const option = checkbox.options[optionName];
                option.selected = !option.selected;
                option.selected
                    ? checkbox.selected.push(optionName)
                    : (checkbox.selected = checkbox.selected.filter((name) => name !== optionName));
                this.clearScrollLimit();
                this.render(true);
            }
        });

        // Filter for ranges
        $controlArea.find<HTMLInputElement>("input[name*=Bound]").on("keyup", (event) => {
            if (event.key !== "Enter") return;
            const $parent = $(event.target).closest("div");
            const name = ($parent.closest("div .filtercontainer").data("filterName") as string) ?? "";
            const ranges = currentTab.filterData.ranges;
            if (ranges && objectHasKey(ranges, name)) {
                const range = ranges[name];
                const lowerBound = $parent.find<HTMLInputElement>("input[name*=lowerBound]")?.val() ?? "";
                const upperBound = $parent.find<HTMLInputElement>("input[name*=upperBound]")?.val() ?? "";
                if (!(typeof lowerBound === "string") || !(typeof upperBound === "string")) return;
                const values = currentTab.parseRangeFilterInput(name, lowerBound, upperBound);
                range.values = values;
                range.changed = true;
                this.clearScrollLimit();
                this.render(true);
            }
        });

        if (!currentTab) return;

        // Multiselects using tagify
        for (const [key, data] of Object.entries(currentTab.filterData.multiselects ?? {})) {
            const multiselect = html.querySelector<HTMLInputElement>(`input[name=${key}][data-tagify-select]`);
            if (!multiselect) continue;

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

        // Slider filters
        for (const [name, data] of Object.entries(currentTab.filterData.sliders ?? {})) {
            const $slider = $html.find(`div.slider-${name}`);
            if (!$slider) continue;

            const slider = noUiSlider.create($slider[0], {
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

                this.clearScrollLimit();
                this.render();
            });

            // Set styling
            $slider.find(".noUi-handle").each((_index, handle) => {
                const $handle = $(handle);
                $handle.addClass("handle");
            });

            $slider.find(".noUi-connect").each((_index, connect) => {
                $(connect).addClass("range_selected");
            });
        }
    }

    /** Activate click listeners on loaded actors and items */
    private activateResultListeners(): void {
        const $list = this.element.find(".tab.active ul.item-list");
        if ($list.length === 0) return;

        const $items = $list.children("li");
        if ($list.data("listeners-active")) {
            $items.children("a").off("click");
        }

        $items
            .children(".name")
            .children("a.item-link, a.actor-link")
            .on("click", (event) => {
                const entry = $(event.currentTarget).closest(".item")[0].dataset;
                const compendiumId = entry.entryCompendium ?? "";
                const docId = entry.entryId ?? "";
                game.packs
                    .get(compendiumId)
                    ?.getDocument(docId)
                    .then((document) => {
                        document?.sheet?.render(true);
                    });
            });

        // Add an item to selected tokens' actors' inventories
        $items.find("a[data-action=take-item]").on("click", async (event) => {
            const $li = $(event.currentTarget).closest("li");
            const { entryCompendium, entryId } = $li.data();
            this.takePhysicalItem(entryCompendium, entryId);
        });

        // Attempt to buy an item with the selected tokens' actors'
        $items.find("a[data-action=buy-item]").on("click", (event) => {
            const $li = $(event.currentTarget).closest("li");
            const { entryCompendium, entryId } = $li.data();
            this.buyPhysicalItem(entryCompendium, entryId);
        });

        // Lazy load list when scrollbar reaches bottom
        $list.on("scroll", (event) => {
            const target = event.currentTarget;
            if (target.scrollTop + target.clientHeight === target.scrollHeight) {
                const tab = this.activeTab;
                if (tab === "settings") return;
                const currentValue = this.tabs[tab].scrollLimit;
                const maxValue = this.tabs[tab].totalItemCount ?? 0;
                if (currentValue < maxValue) {
                    const newValue = Math.clamped(currentValue + 100, 100, maxValue);
                    this.tabs[tab].scrollLimit = newValue;
                    this.render(true);
                }
            }
        });

        $list.data("listeners-active", true);
    }

    private async takePhysicalItem(compendiumId: string, itemId: string): Promise<void> {
        const actors = getSelectedOrOwnActors(["character", "npc"]);
        const item = await this.getPhysicalItem(compendiumId, itemId);

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

    private async buyPhysicalItem(compendiumId: string, itemId: string): Promise<void> {
        const actors = getSelectedOrOwnActors(["character", "npc"]);
        const item = await this.getPhysicalItem(compendiumId, itemId);

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

    private async getPhysicalItem(compendiumId: string, itemId: string): Promise<PhysicalItemPF2e | KitPF2e> {
        const item = await game.packs.get(compendiumId)?.getDocument(itemId);
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

        const $item = $(event.currentTarget);
        const packName = $item.attr("data-entry-compendium");
        const itemPack = game.packs.find((pack) => pack.collection === packName);
        if (!itemPack) return;
        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: itemPack.documentName,
                pack: itemPack.collection,
                id: $item.attr("data-entry-id"),
            })
        );

        $item.one("dragend", () => {
            window.setTimeout(() => {
                this.element.animate({ opacity: 1 }, 250, () => {
                    this.element.css({ pointerEvents: "" });
                });
            }, 500);
        });
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
                    indexData: tab.getIndexData(),
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

    private clearScrollLimit() {
        const tab = this.activeTab;
        if (tab === "settings") return;

        const $list = this.element.find(".tab.active ul.item-list");
        $list.scrollTop(0);
        this.tabs[tab].scrollLimit = 100;
    }
}
