import { ErrorPF2e } from "@util";
import { ScenePF2e } from ".";

export class SceneConfigPF2e<TScene extends ScenePF2e> extends SceneConfig<TScene> {
    /** Hide Unrestricted Vision Range settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Check the setting directly in case the user is viewing the scene config of an inactive scene
        if (game.settings.get("pf2e", "automation.rulesBasedVision")) {
            const $globalLightSettings = $html.find('input[name^="globalLight"]').prop({ disabled: true });
            $html.find('input[name="hasGlobalThreshold"]').prop({ disabled: true });
            $globalLightSettings.siblings(".range-value").addClass("disabled");

            // Indicate that this setting is managed by rules-based vision
            const $managedBy = $("<strong>")
                .addClass("managed-by-rbv")
                .html(" ".concat(game.i18n.localize("PF2E.SETTINGS.Automation.RulesBasedVision.ManagedBy")));

            // Open the automation-settings menu when the provided link is clicked
            $managedBy.find("a").on("click", () => {
                const menu = game.settings.menus.get("pf2e.automation");
                if (!menu) throw ErrorPF2e("Automation Settings application not found");
                const app = new menu.type();
                app.render(true);
            });

            $globalLightSettings.closest(".form-group").find("p.notes").append($managedBy);
        }
    }
}
