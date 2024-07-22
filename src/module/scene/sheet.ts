import { resetActors } from "@actor/helpers.ts";
import { WorldClock } from "@module/apps/world-clock/app.ts";
import type { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import { SettingsMenuOptions } from "@system/settings/menu.ts";
import { ErrorPF2e, createHTMLElement, htmlQuery, htmlQueryAll, tagify } from "@util";
import * as R from "remeda";
import type { ScenePF2e } from "./document.ts";

export class SceneConfigPF2e<TDocument extends ScenePF2e> extends SceneConfig<TDocument> {
    get scene(): TDocument {
        return this.document;
    }

    protected override async _renderInner(
        data: FormApplicationData<TDocument>,
        options: RenderOptions,
    ): Promise<JQuery> {
        const $html = await super._renderInner(data, options);
        const html = $html[0];

        // Rules-based vision
        const [tab, panel] = await (async (): Promise<HTMLTemplateElement[]> => {
            const hbsPath = "systems/pf2e/templates/scene/sheet-partials.hbs";
            const worldDefault = game.i18n.localize(
                game.pf2e.settings.rbv
                    ? "PF2E.SETTINGS.EnabledDisabled.Enabled"
                    : "PF2E.SETTINGS.EnabledDisabled.Disabled",
            );
            const rbvOptions: FormSelectOption[] = [
                {
                    value: "",
                    label: game.i18n.format("PF2E.SETTINGS.EnabledDisabled.Default", { worldDefault }),
                },
                { value: "true", label: game.i18n.localize("PF2E.SETTINGS.EnabledDisabled.Enabled") },
                { value: "false", label: game.i18n.localize("PF2E.SETTINGS.EnabledDisabled.Disabled") },
            ];
            const templates = await renderTemplate(hbsPath, {
                scene: this.scene,
                rbvOptions,
                environmentTypes: this.document.flags.pf2e.environmentTypes ?? [],
            });

            return htmlQueryAll(createHTMLElement("div", { innerHTML: templates }), "template");
        })();

        const tabs = htmlQuery(html, "nav.tabs");
        const ambientTabContent = htmlQuery(html, ".tab[data-tab=ambience]");
        if (!tabs || !ambientTabContent) {
            throw ErrorPF2e("Unexpected error in scene configuration");
        }

        // Add new tab and content, throwing a type error if it fails
        tabs.append(...tab.content.children);
        ambientTabContent.after(...panel.content.children);

        return $(html);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Open world automation settings
        htmlQuery(html, "button[data-action=world-rbv-setting]")?.addEventListener("click", () => {
            const menu = game.settings.menus.get("pf2e.automation");
            if (menu) {
                const options: Partial<SettingsMenuOptions> = { highlightSetting: "rulesBasedVision" };
                const app = new menu.type(undefined, options);
                app.render(true);
            }
        });

        tagify(htmlQuery<HTMLTagifyTagsElement>(html, 'tagify-tags[name="flags.pf2e.environmentTypes"]'), {
            whitelist: CONFIG.PF2E.environmentTypes,
            enforceWhitelist: true,
        });

        this.#activateRBVListeners(html);
    }

    /** Hide Global Illumination settings when rules-based vision is enabled. */
    #activateRBVListeners(html: HTMLElement): void {
        if (!this.document.rulesBasedVision) return;

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
    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const rbvSetting = formData["flags.pf2e.rulesBasedVision"];
        formData["flags.pf2e.rulesBasedVision"] = rbvSetting === "true" ? true : rbvSetting === "false" ? false : null;

        const hearingRange = formData["flags.pf2e.hearingRange"];
        formData["flags.pf2e.hearingRange"] =
            typeof hearingRange === "number" ? Math.ceil(Math.clamp(hearingRange || 5, 5, 3000) / 5) * 5 : null;

        const terrainChanged = !R.isDeepEqual(
            formData["flags.pf2e.environmentTypes"],
            this.scene._source.flags?.pf2e?.environmentTypes ?? [],
        );

        await super._updateObject(event, formData);

        if (terrainChanged) {
            // Scene terrain changed. Reset all affected actors
            for (const token of this.scene.tokens) {
                if (token.actor) resetActors([token.actor], { tokens: true });
            }
        }
        // Rerender scene region legend to update the scene terrain tags
        canvas.scene?.apps["region-legend"]?.render();
    }
}
