import { htmlQuery, htmlQueryAll, localizer, objectHasKey } from "@util";
import type {
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "types/foundry/client-esm/applications/_types.ts";
import type {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "types/foundry/client-esm/applications/api/handlebars-application.ts";
import type { PackInfo, TabName } from "./data.ts";

const foundryApp = foundry.applications.api;

class CompendiumBrowserSettingsApp extends foundryApp.HandlebarsApplicationMixin(foundryApp.ApplicationV2) {
    #tabSettings: Record<TabName, CompendiumBrowserSettingsData> = {
        action: {
            label: "PF2E.CompendiumBrowser.TabAction",
        },
        bestiary: {
            label: "PF2E.CompendiumBrowser.TabBestiary",
        },
        campaignFeature: {
            label: "PF2E.CompendiumBrowser.TabCampaign",
        },
        equipment: {
            label: "TYPES.Item.equipment",
        },
        feat: {
            label: "PF2E.CompendiumBrowser.TabFeat",
        },
        hazard: {
            label: "PF2E.Actor.Hazard.Plural",
        },
        spell: {
            label: "PF2E.Item.Spell.Plural",
        },
    };

    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        id: "compendium-browser-settings",
        classes: ["compendium-browser"],
        tag: "form",
        position: {
            width: 800,
            height: 700,
        },
        window: {
            resizable: true,
            title: "PF2E.CompendiumBrowser.Settings.Title",
        },
        form: {
            submitOnChange: false,
            closeOnSubmit: true,
            handler: this.#onSubmit,
        },
    };

    static override PARTS: Record<string, HandlebarsTemplatePart> = {
        mainWindow: {
            template: "systems/pf2e/templates/compendium-browser/settings/settings.hbs",
            scrollable: [".settings-container"],
        },
    };

    override tabGroups: Record<string, string> = {
        settings: "packs",
    };

    protected override async _preFirstRender(
        context: Record<string, unknown>,
        options: ApplicationRenderOptions,
    ): Promise<void> {
        await super._preFirstRender(context, options);
        const browser = game.pf2e.compendiumBrowser;
        return browser.packLoader.updateSources(browser.loadedPacksAll());
    }

    protected override _attachPartListeners(partId: string, html: HTMLElement, options: HandlebarsRenderOptions): void {
        super._attachPartListeners(partId, html, options);

        const sourceSearch = htmlQuery<HTMLInputElement>(html, "input[data-element=setting-sources-search]");
        const sourceToggle = htmlQuery<HTMLInputElement>(html, "input[data-action=setting-sources-toggle-visible]");
        const sourceSettings = htmlQueryAll<HTMLElement>(html, "label[data-element=setting-source]");

        sourceSearch?.addEventListener("input", () => {
            const value = sourceSearch.value?.trim().toLocaleLowerCase(game.i18n.lang);

            for (const element of sourceSettings) {
                const name = element.dataset.name?.toLocaleLowerCase(game.i18n.lang);
                const shouldBeHidden = !!value && !!name && !name.includes(value);

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

        const deleteButton = htmlQuery<HTMLInputElement>(html, "button[data-action=settings-sources-delete]");
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
                const browser = game.pf2e.compendiumBrowser;
                await browser.packLoader.hardReset(browser.loadedPacksAll());
                await game.settings.set("pf2e", "compendiumBrowserSources", browser.packLoader.sourcesSettings);
                await browser.resetInitializedTabs();
                await this.render();
                this.changeTab("source", "settings", { force: true });
                browser.render(true);
            }
        });
    }

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<object> {
        if (game.settings.get("pf2e", "campaignType") === "none") {
            this.#tabSettings.campaignFeature.hidden = true;
        }
        const browser = game.pf2e.compendiumBrowser;
        for (const [name, settings] of Object.entries(browser.settings)) {
            if (objectHasKey(this.#tabSettings, name)) {
                const duplicates = new Set<string>();
                const seen = new Set<string>();
                // Find multiple entries for the same module
                for (const setting of Object.values(settings)) {
                    if (!setting || setting.package === "pf2e") continue;
                    if (seen.has(setting.package)) {
                        duplicates.add(setting.package);
                        continue;
                    }
                    seen.add(setting.package);
                }
                // Show the full pack id if a module has multiple packs in the same category
                for (const setting of Object.values(settings)) {
                    if (!setting || setting.package === "pf2e") continue;
                    if (duplicates.has(setting.package)) {
                        setting.showFullId = true;
                    }
                }
                this.#tabSettings[name].settings = settings;
            } else {
                console.warn(`Unknown Compendium Browser setting "${name}"!`);
            }
        }

        return {
            user: game.user,
            tabSettings: this.#tabSettings,
            sources: browser.packLoader.sourcesSettings,
        };
    }

    static async #onSubmit(
        _event: SubmitEvent | Event,
        _form: HTMLFormElement,
        formData: FormDataExtended,
    ): Promise<void> {
        const browser = game.pf2e.compendiumBrowser;
        const settings = browser.settings;
        const getCheckboxValue = (key: string): boolean => {
            return formData.get(key) === "true";
        };

        for (const [t, packs] of Object.entries(settings) as [string, { [key: string]: PackInfo }][]) {
            for (const [key, pack] of Object.entries(packs) as [string, PackInfo][]) {
                pack.load = getCheckboxValue(`${t}-${key}`);
            }
        }
        await game.settings.set("pf2e", "compendiumBrowserPacks", settings);

        for (const [key, source] of Object.entries(browser.packLoader.sourcesSettings.sources)) {
            if (!source?.name) {
                delete browser.packLoader.sourcesSettings.sources[key]; // just to make sure we clean up
                continue;
            }
            source.load = getCheckboxValue(`source-${key}`);
        }

        browser.packLoader.sourcesSettings.showEmptySources = getCheckboxValue("show-empty-sources");
        browser.packLoader.sourcesSettings.showUnknownSources = getCheckboxValue("show-unknown-sources");
        browser.packLoader.sourcesSettings.ignoreAsGM = getCheckboxValue("ignore-as-gm");
        await game.settings.set("pf2e", "compendiumBrowserSources", browser.packLoader.sourcesSettings);

        await browser.resetInitializedTabs();
        ui.notifications.info("PF2E.CompendiumBrowser.Settings.Saved", { localize: true });
    }
}

interface CompendiumBrowserSettingsData {
    label: string;
    settings?: Record<string, PackInfo | undefined> | null;
    hidden?: boolean;
}

export { CompendiumBrowserSettingsApp };
