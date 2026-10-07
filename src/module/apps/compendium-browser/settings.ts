import { htmlQuery, htmlQueryAll, localizer, objectHasKey } from "@util";
import * as R from "remeda";
import type { PackInfo, TabName } from "./data.ts";

class CompendiumBrowserSettingsApp extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    static TAB_LABELS: Record<TabName, string> = {
        action: "PF2E.CompendiumBrowser.TabAbilities",
        bestiary: "PF2E.CompendiumBrowser.TabBestiary",
        campaignFeature: "PF2E.CompendiumBrowser.TabCampaign",
        equipment: "PF2E.CompendiumBrowser.TabEquipment",
        feat: "PF2E.CompendiumBrowser.TabFeat",
        hazard: "PF2E.CompendiumBrowser.TabHazard",
        spell: "PF2E.CompendiumBrowser.TabSpell",
    };

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
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

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        mainWindow: {
            template: `systems/${SYSTEM_ID}/templates/compendium-browser/settings/settings.hbs`,
            scrollable: [".settings-container"],
        },
    };

    override tabGroups: Record<string, string> = {
        settings: "packs",
    };

    protected override async _preFirstRender(
        context: Record<string, unknown>,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._preFirstRender(context, options);
        const browser = game.pf2e.compendiumBrowser;
        return browser.packLoader.updateSources(browser.loadedPacksAll());
    }

    protected override _attachPartListeners(
        partId: string,
        html: HTMLElement,
        options: fa.api.HandlebarsRenderOptions,
    ): void {
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
            const confirm = await foundry.applications.api.DialogV2.confirm({
                window: { title: localize("DeleteAllTitle") },
                content: `
                    <p>
                        ${localize("DeleteAllQuestion")}
                    </p>
                    <p>
                        ${localize("DeleteAllInfo")}
                    </p>`,
            });

            if (confirm) {
                const browser = game.pf2e.compendiumBrowser;
                await browser.packLoader.hardReset(browser.loadedPacksAll());
                await game.settings.set(SYSTEM_ID, "compendiumBrowserSources", browser.packLoader.sourcesSettings);
                await browser.resetInitializedTabs();
                await this.render();
                this.changeTab("source", "settings", { force: true });
                browser.render({ force: true });
            }
        });
    }

    protected override async _prepareContext(_options: fa.api.HandlebarsRenderOptions): Promise<object> {
        // Rebuilt per render so a campaign type change can unhide the campaign tab
        const tabSettings = R.mapValues(
            CompendiumBrowserSettingsApp.TAB_LABELS,
            (label): CompendiumBrowserSettingsData => ({ label }),
        );
        tabSettings.campaignFeature.hidden = game.settings.get(SYSTEM_ID, "campaignType") === "none";
        const browser = game.pf2e.compendiumBrowser;
        for (const [name, settings] of Object.entries(browser.settings)) {
            if (objectHasKey(tabSettings, name)) {
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
                tabSettings[name].settings = settings;
            } else {
                console.warn(`Unknown Compendium Browser setting "${name}"!`);
            }
        }

        return {
            user: game.user,
            tabSettings,
            sources: browser.packLoader.sourcesSettings,
        };
    }

    static async #onSubmit(_event: Event, _form: HTMLFormElement, formData: fa.ux.FormDataExtended): Promise<void> {
        const browser = game.pf2e.compendiumBrowser;
        const settings = browser.settings;
        const getCheckboxValue = (key: string): boolean => {
            return formData.get(key) === "true";
        };

        for (const [t, packs] of Object.entries(settings) as [string, { [key: string]: PackInfo }][]) {
            for (const [key, pack] of Object.entries(packs) as [string, PackInfo][]) {
                // Packs of a hidden tab aren't in the form
                const field = `${t}-${key}`;
                if (formData.has(field)) pack.load = getCheckboxValue(field);
            }
        }
        await game.settings.set(SYSTEM_ID, "compendiumBrowserPacks", settings);

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
        await game.settings.set(SYSTEM_ID, "compendiumBrowserSources", browser.packLoader.sourcesSettings);

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
