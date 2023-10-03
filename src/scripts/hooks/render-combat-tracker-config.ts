import { htmlClosest, htmlQueryAll } from "@util";

export const RenderCombatTrackerConfig = {
    listen: (): void => {
        Hooks.on("renderCombatTrackerConfig", async (app, $html) => {
            // Add "death icon" and "actors dead at zero" settings
            const html = $html[0];
            const appWindow = htmlClosest(html, "#combat-config");
            if (appWindow) appWindow.style.height = "";

            const template = await (async () => {
                const markup = await renderTemplate("systems/pf2e/templates/sidebar/encounter-tracker/config.hbs", {
                    values: {
                        deathIcon: game.settings.get("pf2e", "deathIcon"),
                        actorsDeadAtZero: game.settings.get("pf2e", "automation.actorsDeadAtZero"),
                    },
                });
                const tempElem = document.createElement("div");
                tempElem.innerHTML = markup;
                return tempElem.firstElementChild instanceof HTMLTemplateElement ? tempElem.firstElementChild : null;
            })();
            const formGroups = htmlQueryAll(html, ".form-group");
            const lastFormGroup = formGroups.at(-1);
            lastFormGroup?.after(...(template?.content.children ?? []));

            // Reactivate listeners to make the file picker work
            app.activateListeners($html);
        });
    },
};
