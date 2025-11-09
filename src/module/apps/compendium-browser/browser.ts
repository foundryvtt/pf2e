import { AbilityTrait, ActionCategory } from "@item/ability/index.ts";
import type { ActionType } from "@item/base/data/index.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { BaseSpellcastingEntry } from "@item/spellcasting-entry/index.ts";
import type { ItemType } from "@item/types.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { ErrorPF2e, setHasElement } from "@util";
import * as R from "remeda";
import { untrack } from "svelte";
import App from "./components/app.svelte";
import { BrowserTab, BrowserTabs, ContentTabName, PackInfo, SourceInfo, TabData, TabName } from "./data.ts";
import { PackLoader } from "./loader.ts";
import { CompendiumBrowserSettingsApp } from "./settings.ts";
import { BrowserFilter } from "./tabs/data.ts";
import * as browserTabs from "./tabs/index.ts";

class CompendiumBrowser extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    /** The amount of rendered result items for initial loading and per load operation */
    static RESULT_LIMIT = 100;

    declare protected $state: CompendiumBrowserState;

    root = App;

    activeTab: BrowserTab;
    dataTabsList = ["action", "bestiary", "campaignFeature", "equipment", "feat", "hazard", "spell"] as const;
    packLoader = new PackLoader();
    declare settings: CompendiumBrowserSettings;
    tabs: BrowserTabs;
    tabsArray: BrowserTab[];

    constructor(options: Partial<fa.ApplicationConfiguration> = {}) {
        super(options);

        this.tabs = {
            action: new browserTabs.Actions(this),
            bestiary: new browserTabs.Bestiary(this),
            campaignFeature: new browserTabs.CampaignFeatures(this),
            equipment: new browserTabs.Equipment(this),
            feat: new browserTabs.Feats(this),
            hazard: new browserTabs.Hazards(this),
            spell: new browserTabs.Spells(this),
        };
        this.tabsArray = R.values(this.tabs);
        this.activeTab = this.tabs.action;

        this.initCompendiumList();
    }

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "compendium-browser",
        classes: ["compendium-browser"],
        position: {
            width: 800,
            height: 700,
        },
        window: {
            icon: "fa-solid fa-atlas",
            controls: [
                {
                    action: "openSettings",
                    icon: "fa-solid fa-gears",
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
            title: "PF2E.CompendiumBrowser.Title",
        },
        actions: {
            addToRollTable: function (this: CompendiumBrowser) {
                if (!this.activeTab) return;
                this.toggleControls(false);
                this.activeTab.addToRollTable();
            },
            createRollTable: function (this: CompendiumBrowser) {
                if (!this.activeTab) return;
                this.toggleControls(false);
                this.activeTab.createRollTable();
            },
            openSettings: function (this: CompendiumBrowser) {
                this.toggleControls(false);
                new CompendiumBrowserSettingsApp().render({ force: true });
            },
        },
    };

    protected override async _onFirstRender(
        context: fa.ApplicationRenderContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.#setVisibleTabs();
    }

    protected override _onClose(options: fa.ApplicationClosingOptions): void {
        super._onClose(options);
        for (const tab of this.tabsArray) {
            tab.filterData.search.text = "";
        }
    }

    protected override _getHeaderControls(): fa.ApplicationHeaderControlsEntry[] {
        const controls = super._getHeaderControls();
        const gmControls = ["addToRollTable", "createRollTable", "openSettings"];
        for (const control of controls) {
            if (!game.user.isGM && gmControls.includes(control.action)) {
                control.visible = false;
            }
        }
        return controls;
    }

    protected override async _prepareContext(_options: fa.ApplicationRenderOptions): Promise<CompendiumBrowserContext> {
        return {
            state: {
                activeTabName: "",
                resultList: document.createElement("ul"), // This is required to make the value bindable
            },
        };
    }

    #setVisibleTabs(visible?: ContentTabName[]): void {
        const isGM = game.user.isGM;
        const showCampaign = game.settings.get("pf2e", "campaignType") !== "none";
        for (const tab of this.tabsArray) {
            tab.visible = visible ? visible.includes(tab.tabName) : true;
            if (!showCampaign && tab.tabName === "campaignFeature") tab.visible = false;
            if (tab.isGMOnly && !isGM) tab.visible = false;
        }
    }

    resetListElement(): void {
        untrack(() => (this.activeTab.resultLimit = CompendiumBrowser.RESULT_LIMIT));
        this.$state.resultList?.scrollTo({ top: 0, behavior: "instant" });
    }

    async openTab(tabName: TabName, options?: CompendiumBrowserOpenTabOptions): Promise<void> {
        if (!this.dataTabsList.includes(tabName)) {
            throw ErrorPF2e(`Unknown tab "${tabName}"`);
        }

        this.activeTab = this.tabs[tabName];

        if (this.activeTab.isGMOnly && !game.user.isGM) {
            throw ErrorPF2e("Tried to open GM-only browser tab!");
        }
        if (options?.filter) {
            if (!this.activeTab.isInitialized) {
                throw ErrorPF2e("Tried to pass filter data to an uninitialized tab!");
            }
            this.activeTab.filterData = options.filter;
        }
        await this.activeTab.init();

        if (!this.rendered) {
            await this.render({ force: true });
        }

        if (options?.hideNavigation) {
            this.#setVisibleTabs([]);
        } else if (options?.showTabs) {
            if (!options.showTabs.every((t) => this.dataTabsList.includes(t))) {
                throw ErrorPF2e(`Unknown tab name in "${options.showTabs}"`);
            }
            // Always include the active tab name
            if (!options.showTabs.includes(tabName)) {
                options.showTabs.push(tabName);
            }
            this.#setVisibleTabs(options.showTabs);
        } else {
            this.#setVisibleTabs();
        }
        this.$state.activeTabName = tabName;

        this.bringToFront();
    }

    async openActionTab(options: {
        types?: ActionType[];
        categories?: ActionCategory[];
        traits?: AbilityTrait[];
    }): Promise<void> {
        const actionTab = this.tabs.action;
        const filter = await actionTab.getFilterData();
        const types = filter.checkboxes.types;
        const traits = filter.traits;

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

        actionTab.open({ filter });
    }

    async openSpellTab(entry: BaseSpellcastingEntry, maxRank = 10, category: string | null = null): Promise<void> {
        const spellTab = this.tabs.spell;
        const filter = await spellTab.getFilterData();
        const traditions = filter.checkboxes.traditions;

        if (category && filter.checkboxes.category.options[category]) {
            filter.checkboxes.category.options[category].selected = true;
            filter.checkboxes.category.selected.push(category);
        }

        if (entry.category === "ritual" || entry.isFocusPool) {
            filter.checkboxes.category.options[entry.category].selected = true;
            filter.checkboxes.category.selected.push(entry.category);
        }

        if (maxRank) {
            const ranks = Array.from(Array(maxRank).keys()).map((l) => String(l + 1));
            for (const rank of ranks) {
                filter.checkboxes.rank.options[rank].selected = true;
                filter.checkboxes.rank.selected.push(rank);
            }
            if (["prepared", "spontaneous", "innate"].includes(entry.category) && !category) {
                filter.checkboxes.category.options["spell"].selected = true;
                filter.checkboxes.category.selected.push("spell");
            }
        }

        if (entry.tradition && !entry.isFocusPool && entry.category !== "ritual") {
            traditions.options[entry.tradition].selected = true;
            traditions.selected.push(entry.tradition);
        }

        spellTab.open({ filter });
    }

    initCompendiumList(): void {
        const settings: TabData<Record<string, PackInfo | undefined>> = {
            action: {},
            bestiary: {},
            campaignFeature: {},
            hazard: {},
            equipment: {},
            feat: {},
            spell: {},
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
        const typeToTab = new Map<ItemType | "hazard" | "npc", TabName>([
            ["action", "action"],
            ["campaignFeature", "campaignFeature"],
            ["feat", "feat"],
            ["kit", "equipment"],
            ["hazard", "hazard"],
            ["npc", "bestiary"],
            ["spell", "spell"],
            ...Array.from(PHYSICAL_ITEM_TYPES).map((t): [ItemType, "equipment"] => [t, "equipment"]),
        ]);

        const userSettings = game.settings.get("pf2e", "compendiumBrowserPacks");
        for (const pack of game.packs) {
            if (!pack.testUserPermission(game.user, "LIMITED")) continue;
            const tabNames = R.unique(
                R.unique(pack.index.map((entry) => entry.type))
                    .filter((t): t is BrowsableType => setHasElement(browsableTypes, t))
                    .flatMap((t) => typeToTab.get(t) ?? []),
            );
            for (const tabName of tabNames) {
                settings[tabName][pack.collection] = {
                    load: userSettings[tabName]?.[pack.collection]?.load !== false,
                    name: pack.metadata.label,
                    package: pack.metadata.packageName,
                };
            }
        }

        for (const tab of this.dataTabsList) {
            settings[tab] = Object.fromEntries(
                Object.entries(settings[tab]).sort(
                    ([_collectionA, dataA], [_collectionB, dataB]) =>
                        dataA?.name.localeCompare(dataB?.name ?? "", game.i18n.lang) ?? 1,
                ),
            );
        }

        this.settings = settings;
    }

    loadedPacks(tab: TabName): string[] {
        return Object.entries(this.settings[tab] ?? []).flatMap(([collection, info]) => {
            return info?.load ? [collection] : [];
        });
    }

    loadedPacksAll(): string[] {
        return R.unique(this.dataTabsList.flatMap((t) => this.loadedPacks(t))).sort();
    }

    async resetInitializedTabs(): Promise<void> {
        for (const tab of this.tabsArray) {
            if (tab.isInitialized) {
                await tab.init(true);
            }
        }
        this.$state.activeTabName = "";
    }
}

interface CompendiumBrowserContext extends SvelteApplicationRenderContext {
    state: CompendiumBrowserState;
}

interface CompendiumBrowserState {
    /** Changing this will trigger a tab rerender. An empty string will show the landing page */
    activeTabName: ContentTabName | "";
    /** The result list HTML element */
    resultList: HTMLUListElement;
}

type CompendiumBrowserSettings = TabData<Record<string, PackInfo | undefined>>;

type CompendiumBrowserSourcesList = Record<string, SourceInfo | undefined>;
interface CompendiumBrowserSources {
    ignoreAsGM: boolean;
    showEmptySources: boolean;
    showUnknownSources: boolean;
    sources: CompendiumBrowserSourcesList;
}

interface CompendiumBrowserOpenTabOptions {
    /** Optional filter data for the opened tab */
    filter?: BrowserFilter;
    /** Hide the navigation element */
    hideNavigation?: boolean;
    /** Only show the given tabs in the navigation element. This will always include the openend tab */
    showTabs?: ContentTabName[];
}

export { CompendiumBrowser };
export type {
    CompendiumBrowserContext,
    CompendiumBrowserOpenTabOptions,
    CompendiumBrowserSettings,
    CompendiumBrowserSources,
    CompendiumBrowserState,
};
