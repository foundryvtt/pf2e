import { ErrorPF2e } from "@util";
import { ScenePF2e } from ".";

export class SceneConfigPF2e<TScene extends ScenePF2e> extends SceneConfig<TScene> {
    /** Hide Unrestricted Vision Range settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Check the setting directly in case the user is viewing the scene config of an inactive scene
        if (game.settings.get("pf2e", "automation.rulesBasedVision") && this.document.tokenVision) {
            const html = $html[0]!;
            const globalLight = html.querySelector<HTMLInputElement>("input[name^=globalLight]");
            const hasglobalThreshold = html.querySelector<HTMLInputElement>("input[name=hasGlobalThreshold]");
            const globalLightThreshold = html.querySelector<HTMLInputElement>("input[name=globalLightThreshold]");
            const thresholdSettings = globalLightThreshold?.closest(".form-group");
            if (!(globalLight && hasglobalThreshold && globalLightThreshold && thresholdSettings)) throw ErrorPF2e("");
            globalLight.disabled = true;
            hasglobalThreshold.disabled = true;
            globalLightThreshold.disabled = true;
            thresholdSettings.querySelector(".range-value")?.classList.add("disabled");

            // Indicate that this setting is managed by rules-based vision
            const managedBy = document.createElement("strong");
            managedBy.classList.add("managed-by-rbv");
            managedBy.innerHTML = " ".concat(game.i18n.localize("PF2E.SETTINGS.Automation.RulesBasedVision.ManagedBy"));

            // Open the automation-settings menu when the provided link is clicked
            managedBy.querySelector("a")?.addEventListener("click", () => {
                const menu = game.settings.menus.get("pf2e.automation");
                if (!menu) throw ErrorPF2e("Automation Settings application not found");
                const app = new menu.type();
                app.render(true);
            });

            thresholdSettings.querySelector("p.notes")?.append(managedBy);
            const globalLightSettings = globalLight.closest(".form-group");
            globalLightSettings?.querySelector("p.notes")?.append(managedBy);
        }
    }
}
