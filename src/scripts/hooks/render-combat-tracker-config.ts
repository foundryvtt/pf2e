import type HTMLFilePickerElement from "@client/applications/elements/file-picker.d.mts";
import { htmlQuery, htmlQueryAll } from "@util";

export const RenderCombatTrackerConfig = {
    listen: (): void => {
        Hooks.on("renderCombatTrackerConfig", async (_app, html) => {
            // Add "death icon" and "actors dead at zero"
            const template = await (async () => {
                const path = `systems/${SYSTEM_ID}/templates/sidebar/encounter-tracker/config.hbs`;
                const markup = await fa.handlebars.renderTemplate(path, {
                    values: {
                        deathIcon: game.settings.get(SYSTEM_ID, "deathIcon"),
                        actorsDeadAtZero: game.settings.get(SYSTEM_ID, "automation.actorsDeadAtZero"),
                        deadAtZeroOptions: [
                            { value: "both", label: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Both" },
                            { value: "npcsOnly", label: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.NPCsOnly" },
                            { value: "neither", label: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Neither" },
                        ],
                    },
                });
                const tempElem = document.createElement("div");
                tempElem.innerHTML = markup;
                return tempElem.firstElementChild instanceof HTMLTemplateElement ? tempElem.firstElementChild : null;
            })();
            const formGroups = htmlQueryAll(html, ".form-group");
            const lastFormGroup = formGroups.at(-1);
            lastFormGroup?.after(...(template?.content.children ?? []));

            html.addEventListener("submit", async () => {
                const newIcon = htmlQuery<HTMLFilePickerElement>(html, "file-picker[name=deathIcon]")?.value;
                const newDeadAtZero = htmlQuery<HTMLSelectElement>(html, "select[name=actorsDeadAtZero]")?.value;

                if (newIcon && newIcon !== game.settings.get(SYSTEM_ID, "deathIcon")) {
                    await game.settings.set(SYSTEM_ID, "deathIcon", newIcon);
                }

                const currentDeadAtZero = game.settings.get(SYSTEM_ID, "automation.actorsDeadAtZero");
                if (newDeadAtZero && currentDeadAtZero !== newDeadAtZero) {
                    await game.settings.set(SYSTEM_ID, "automation.actorsDeadAtZero", newDeadAtZero);
                }
            });
        });
    },
};
