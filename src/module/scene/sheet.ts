import { resetActors } from "@actor/helpers.ts";
import HTMLRangePickerElement from "@client/applications/elements/range-picker.mjs";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { DatabaseCreateOperation, DatabaseUpdateOperation } from "@common/abstract/_types.d.mts";
import { WorldClock } from "@module/apps/world-clock/app.ts";
import type { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import type { SettingsMenuOptions } from "@system/settings/menu.ts";
import { createHTMLElement, ErrorPF2e, htmlQuery } from "@util";
import { tagify } from "@util/tags.ts";
import * as R from "remeda";
import type { ScenePF2e } from "./document.ts";

export class SceneConfigPF2e<TDocument extends ScenePF2e> extends fa.sheets.SceneConfig<TDocument> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration> = {
        sheetConfig: false,
        actions: { openAutomationSettings: SceneConfigPF2e.#onClickOpenAutomationSettings },
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
        parts.pf2e = { template: "systems/pf2e/templates/scene/pf2e-panel.hbs" };
        parts.footer = footer;
        return parts;
    }

    /** Prepare context data for the pf2e tab */
    protected override async _preparePartContext(
        partId: string,
        context: Record<string, unknown>,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<Record<string, unknown>> {
        const partContext = await super._preparePartContext(partId, context, options);
        if (partId === "pf2e") {
            const worldDefault = game.i18n.localize(
                game.pf2e.settings.rbv
                    ? "PF2E.SETTINGS.EnabledDisabled.Enabled"
                    : "PF2E.SETTINGS.EnabledDisabled.Disabled",
            );
            partContext.rbvOptions = [
                {
                    value: "",
                    label: game.i18n.format("PF2E.SETTINGS.EnabledDisabled.Default", { worldDefault }),
                },
                { value: "true", label: game.i18n.localize("PF2E.SETTINGS.EnabledDisabled.Enabled") },
                { value: "false", label: game.i18n.localize("PF2E.SETTINGS.EnabledDisabled.Disabled") },
            ] satisfies FormSelectOption[];
            partContext.environmentTypes = this.document.flags.pf2e.environmentTypes ?? [];
        }
        return partContext;
    }

    protected override async _onRender(
        context: Record<string, unknown>,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);
        this.#activateRBVListeners();
        tagify(htmlQuery<HTMLTagifyTagsElement>(this.element, 'tagify-tags[name="flags.pf2e.environmentTypes"]'), {
            whitelist: CONFIG.PF2E.environmentTypes,
            enforceWhitelist: true,
        });
    }

    /** Hide Global Illumination settings when rules-based vision is enabled. */
    #activateRBVListeners(): void {
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

    /** Intercept flag update and change to boolean/null. */
    protected override async _processSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        submitData: Record<string, unknown>,
        options?: Partial<DatabaseCreateOperation<null>> | Partial<DatabaseUpdateOperation<null>>,
    ): Promise<void> {
        const rbvSetting = submitData["flags.pf2e.rulesBasedVision"];
        submitData["flags.pf2e.rulesBasedVision"] =
            rbvSetting === "true" ? true : rbvSetting === "false" ? false : null;

        const hearingRange = submitData["flags.pf2e.hearingRange"];
        submitData["flags.pf2e.hearingRange"] =
            typeof hearingRange === "number" ? Math.ceil(Math.clamp(hearingRange || 5, 5, 3000) / 5) * 5 : null;

        const terrainChanged = !R.isDeepEqual(
            submitData["flags.pf2e.environmentTypes"],
            this.document._source.flags?.pf2e?.environmentTypes ?? [],
        );

        await super._processSubmitData(event, form, submitData, options);

        if (terrainChanged) {
            // Scene terrain changed. Reset all affected actors
            for (const token of this.document.tokens) {
                if (token.actor) resetActors([token.actor], { tokens: true });
            }
        }
        // Rerender scene region legend to update the scene terrain tags
        canvas.scene?.apps["region-legend"]?.render();
    }

    /** Open the Automation settings menu and highlight the rules-based vision field. */
    static async #onClickOpenAutomationSettings(this: SceneConfigPF2e<ScenePF2e>): Promise<void> {
        const menu = game.settings.menus.get("pf2e.automation");
        if (menu) {
            const options: Partial<SettingsMenuOptions> = { highlightSetting: "rulesBasedVision" };
            const app = new menu.type(undefined, options);
            app.render(true);
        }
    }
}
