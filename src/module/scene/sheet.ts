import { resetActors } from "@actor/helpers.ts";
import type HTMLRangePickerElement from "@client/applications/elements/range-picker.d.mts";
import { WorldClock } from "@module/apps/world-clock/app.ts";
import type { SettingsMenuOptions } from "@system/settings/menu.ts";
import { createHTMLElement, ErrorPF2e } from "@util";
import * as R from "remeda";
import type { ScenePF2e } from "./document.ts";
import fields = foundry.data.fields;

export class SceneConfigPF2e<TDocument extends ScenePF2e> extends fa.sheets.SceneConfig<TDocument> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration> = {
        sheetConfig: false,
        actions: {
            openAutomationSettings: SceneConfigPF2e.#onClickOpenAutomationSettings,
            openWorldClockSettings: SceneConfigPF2e.#onClickOpenWorldClockSettings,
        },
    };

    static override TABS = (() => {
        const tabsConfig = super.TABS;
        tabsConfig["sheet"].tabs.push({ id: "pf2e", icon: "action-glyph", label: "PF2E.Pathfinder" });
        return tabsConfig;
    })();

    protected override _configureRenderParts(
        options: fa.api.HandlebarsRenderOptions,
    ): Record<string, fa.api.HandlebarsTemplatePart> {
        const parts = super._configureRenderParts(options);
        const footer = parts.footer;
        delete parts.footer;
        parts.pf2e = { template: `${SYSTEM_ROOT}/templates/scene/pf2e-panel.hbs` };
        parts.footer = footer;
        return parts;
    }

    /** Prepare context data for the pf2e tab */
    protected override async _preparePartContext(
        partId: string,
        context: fa.api.DocumentSheetRenderContext,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<fa.api.DocumentSheetRenderContext> {
        const partContext = await super._preparePartContext(partId, context, options);
        if (partId !== "pf2e") return partContext;
        return Object.assign(partContext, {
            scene: this.document,
            rbvOptions: [
                {
                    value: "",
                    label: game.i18n.format("PF2E.SETTINGS.EnabledDisabled.Default", {
                        worldDefault: game.i18n.localize(
                            game.pf2e.settings.rbv
                                ? "PF2E.SETTINGS.EnabledDisabled.Enabled"
                                : "PF2E.SETTINGS.EnabledDisabled.Disabled",
                        ),
                    }),
                },
                { value: "true", label: game.i18n.localize("PF2E.SETTINGS.EnabledDisabled.Enabled") },
                { value: "false", label: game.i18n.localize("PF2E.SETTINGS.EnabledDisabled.Disabled") },
            ],
            syncDarknessOptions: [
                {
                    value: "default",
                    label: game.i18n.format("PF2E.SETTINGS.EnabledDisabled.Default", {
                        worldDefault: game.i18n.localize(
                            game.pf2e.settings.worldClock.syncDarkness
                                ? "PF2E.SETTINGS.EnabledDisabled.Enabled"
                                : "PF2E.SETTINGS.EnabledDisabled.Disabled",
                        ),
                    }),
                },
                { value: "enabled", label: game.i18n.localize("PF2E.SETTINGS.EnabledDisabled.Enabled") },
                { value: "disabled", label: game.i18n.localize("PF2E.SETTINGS.EnabledDisabled.Disabled") },
            ],
            environmentTypes: new fields.SetField(
                new fields.StringField({ required: true, initial: undefined, choices: CONFIG.PF2E.environmentTypes }),
                { label: "PF2E.Region.Environment.Type.Label", hint: "PF2E.Region.Environment.Type.SceneHint" },
            ),
        });
    }

    protected override async _onRender(
        context: Record<string, unknown>,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);
        this.#adjustForm();
    }

    /** Disable Global Illumination settings when rules-based vision is enabled. */
    #adjustForm(): void {
        const scene = this.document;
        if (!scene.rulesBasedVision) return;

        const html = this.element;
        const globalLight = html.querySelector<HTMLInputElement>('input[name="environment.globalLight.enabled"]');
        const globalLightThreshold = html.querySelector<HTMLRangePickerElement>(
            'range-picker[name="environment.globalLight.darkness.max"]',
        );
        if (!(globalLight && globalLightThreshold)) {
            throw ErrorPF2e("Unexpected error retrieving scene global light form elements");
        }

        // Disable all global light settings
        globalLight.disabled = true;
        globalLightThreshold.disabled = true;
        // Also set their values to the prepared values
        globalLight.checked = scene.environment.globalLight.enabled;
        globalLightThreshold.value = scene.environment.globalLight.darkness.max;

        // Indicate that this setting is managed by rules-based vision and create link to open settings
        const managedBy = createHTMLElement("button", {
            classes: ["inline-control", "icon", "fa-solid", "fa-robot"],
            dataset: { tooltip: true, action: "openAutomationSettings" },
            aria: { label: game.i18n.localize("PF2E.SETTINGS.Automation.RulesBasedVision.ManagedBy") },
        });
        managedBy.type = "button";
        managedBy.disabled = !game.user.isGM;
        for (const input of [globalLight, globalLightThreshold]) {
            const button = managedBy.cloneNode(true);
            const labelEl = input.closest(".form-group")?.querySelector("label");
            labelEl?.classList.add("flexrow", "managed-by-rbv");
            labelEl?.append(button);
        }

        // Disable scene darkness slider if darkness is synced to the world clock
        if (this.document.darknessSyncedToTime) {
            const darknessInput = html.querySelector<HTMLInputElement>("input[name=darkness]");
            if (darknessInput) {
                darknessInput.disabled = true;
                darknessInput.nextElementSibling?.classList.add("disabled");
                const managedBy = WorldClock.createSyncedMessage();
                darknessInput.closest(".form-group")?.querySelector("p.hint")?.append(managedBy);
            }
        }
    }

    protected override _prepareSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
        updateData?: Record<string, unknown>,
    ): Record<string, unknown> {
        const rbvSetting = formData.object["flags.pf2e.rulesBasedVision"];
        formData.object["flags.pf2e.rulesBasedVision"] =
            rbvSetting === "true" ? true : rbvSetting === "false" ? false : null;

        const hearingRange = formData.object["flags.pf2e.hearingRange"];
        formData.object["flags.pf2e.hearingRange"] =
            typeof hearingRange === "number" ? Math.ceil(Math.clamp(hearingRange || 5, 5, 3000) / 5) * 5 : null;

        const terrainChanged = !R.isDeepEqual(
            formData.object["flags.pf2e.environmentTypes"],
            this.document._source.flags?.pf2e?.environmentTypes ?? [],
        );

        if (terrainChanged) {
            // Scene terrain changed. Reset all affected actors
            for (const token of this.document.tokens) {
                if (token.actor) resetActors([token.actor], { tokens: true });
            }
        }
        // Rerender scene region legend to update the scene terrain tags
        canvas.scene?.apps["region-legend"]?.render();

        return super._prepareSubmitData(event, form, formData, updateData);
    }

    /* -------------------------------------------- */
    /*  Click Handlers                              */
    /* -------------------------------------------- */

    /** Open the Automation settings menu and highlight the rules-based vision field. */
    static async #onClickOpenAutomationSettings(this: SceneConfigPF2e<ScenePF2e>): Promise<void> {
        const menu = game.settings.menus.get("pf2e.automation");
        if (menu) {
            const options: Partial<SettingsMenuOptions> = { highlightSetting: "rulesBasedVision" };
            const app = new menu.type(undefined, options);
            app.render(true);
        }
    }

    static async #onClickOpenWorldClockSettings(this: SceneConfigPF2e<ScenePF2e>): Promise<void> {
        const menu = game.settings.menus.get("pf2e.worldClock");
        if (menu) new menu.type().render(true);
    }
}
