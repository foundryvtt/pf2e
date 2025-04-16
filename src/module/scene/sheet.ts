import { resetActors } from "@actor/helpers.ts";
import type { DatabaseCreateOperation, DatabaseUpdateOperation } from "@common/abstract/_types.d.mts";
import { WorldClock } from "@module/apps/world-clock/app.ts";
import type { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import type { SettingsMenuOptions } from "@system/settings/menu.ts";
import { ErrorPF2e, htmlQuery, htmlQueryAll } from "@util";
import { tagify } from "@util/tags.ts";
import * as R from "remeda";
import type { ScenePF2e } from "./document.ts";

export class SceneConfigPF2e<TDocument extends ScenePF2e> extends fa.sheets.SceneConfig<TDocument> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration> = {
        sheetConfig: false,
        actions: { openRbvSetting: SceneConfigPF2e.#openRbvSetting },
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
        if (!this.document.rulesBasedVision) return;

        const html = this.element;
        const globalLight = html.querySelector<HTMLInputElement>('input[name="environment.globalLight.enabled"]');
        const globalLightThreshold = htmlQueryAll<HTMLInputElement>(
            html,
            'range-picker[name="environment.globalLight.darkness.max"] > input',
        );
        if (!(globalLight && globalLightThreshold)) {
            throw ErrorPF2e("Unexpected error retrieving scene global light form elements");
        }

        // Disable all global light settings
        globalLight.disabled = true;
        for (const input of globalLightThreshold) {
            input.disabled = true;
        }

        // Indicate that this setting is managed by rules-based vision and create link to open settings
        for (const input of [globalLight, globalLightThreshold[0]]) {
            const managedBy = document.createElement("span");
            managedBy.classList.add("managed");
            managedBy.innerHTML = " ".concat(game.i18n.localize("PF2E.SETTINGS.Automation.RulesBasedVision.ManagedBy"));
            const rbvLink = managedBy.querySelector("rbv");
            const anchor = document.createElement("a");
            anchor.innerText = rbvLink?.innerHTML ?? "";
            anchor.setAttribute("href", ""); // Pick up core Foundry styling
            anchor.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const menu = game.settings.menus.get("pf2e.automation");
                if (!menu) throw ErrorPF2e("Automation Settings application not found");
                const app = new menu.type();
                app.render(true);
            });
            rbvLink?.replaceWith(anchor);
            input.closest(".form-group")?.querySelector("p.notes")?.append(managedBy);
        }

        // Disable scene darkness slider if darkness is synced to the world clock
        if (this.document.darknessSyncedToTime) {
            const darknessInput = html.querySelector<HTMLInputElement>("input[name=darkness]");
            if (darknessInput) {
                darknessInput.disabled = true;
                darknessInput.nextElementSibling?.classList.add("disabled");
                const managedBy = WorldClock.createSyncedMessage();
                darknessInput.closest(".form-group")?.querySelector("p.notes")?.append(managedBy);
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
    static #openRbvSetting(this: SceneConfigPF2e<ScenePF2e>): void {
        const menu = game.settings.menus.get("pf2e.automation");
        if (menu) {
            const options: Partial<SettingsMenuOptions> = { highlightSetting: "rulesBasedVision" };
            const app = new menu.type(undefined, options);
            app.render(true);
        }
    }
}
