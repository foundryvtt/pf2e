import { WorldClock } from "@module/apps/world-clock/app.ts";
import { ErrorPF2e, createHTMLElement, htmlQuery, htmlQueryAll } from "@util";
import { ScenePF2e } from "./index.ts";
import { SettingsMenuOptions } from "@system/settings/menu.ts";

export class SceneConfigPF2e<TDocument extends ScenePF2e> extends SceneConfig<TDocument> {
    protected override async _renderInner(
        data: FormApplicationData<TDocument>,
        options: RenderOptions
    ): Promise<JQuery> {
        const $html = await super._renderInner(data, options);
        const html = $html[0];

        const [tab, panel] = await (async (): Promise<HTMLTemplateElement[]> => {
            const hbsPath = "systems/pf2e/templates/scene/sheet-partials.hbs";
            const rbvWorldDefault = game.i18n.localize(
                game.settings.get("pf2e", "automation.rulesBasedVision")
                    ? "PF2E.SETTINGS.EnabledDisabled.Enabled"
                    : "PF2E.SETTINGS.EnabledDisabled.Disabled"
            );
            const templates = await renderTemplate(hbsPath, { rbvWorldDefault });
            return htmlQueryAll(createHTMLElement("div", { innerHTML: templates }), "template");
        })();
        htmlQuery(html, "nav.tabs")?.append(...tab.content.children);
        htmlQuery(html, ".tab[data-tab=ambience]")?.after(...panel.content.children);

        return $(html);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Hide Unrestricted Vision Range settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "button[data-action=world-rbv-setting]")?.addEventListener("click", () => {
            const menu = game.settings.menus.get("pf2e.automation");
            if (menu) {
                const options: Partial<SettingsMenuOptions> = { highlightSetting: "rulesBasedVision" };
                const app = new menu.type(undefined, options);
                app.render(true);
            }
        });

        // Check the setting directly in case the user is viewing the scene config of an inactive scene
        if (!this.document.rulesBasedVision) return;

        // Disable all global light settings
        const globalLight = html.querySelector<HTMLInputElement>("input[name^=globalLight]");
        const hasglobalThreshold = html.querySelector<HTMLInputElement>("input[name=hasGlobalThreshold]");
        const globalLightThreshold = html.querySelector<HTMLInputElement>("input[name=globalLightThreshold]");
        if (!(globalLight && hasglobalThreshold && globalLightThreshold)) throw ErrorPF2e("");
        globalLight.disabled = true;
        hasglobalThreshold.disabled = true;
        globalLightThreshold.disabled = true;
        globalLightThreshold.nextElementSibling?.classList.add("disabled");

        // Indicate that this setting is managed by rules-based vision and create link to open settings
        for (const input of [globalLight, globalLightThreshold]) {
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

    /** Nu */
    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const rbvSetting = formData["flags.pf2e.rulesBasedVision"];
        formData["flags.pf2e.rulesBasedVision"] = rbvSetting === "true" ? true : rbvSetting === "false" ? false : null;
        return super._updateObject(event, formData);
    }
}
