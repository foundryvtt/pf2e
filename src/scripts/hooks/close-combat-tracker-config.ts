import { htmlQuery } from "@util";

/** Add a deathIcon setting to the CombatTrackerConfig application */
export const CloseCombatTrackerConfig = {
    listen: (): void => {
        Hooks.on("closeCombatTrackerConfig", async (_app, $html): Promise<void> => {
            const html = $html[0];
            const newIcon = htmlQuery<HTMLInputElement>(html, "file-picker")?.value;
            if (newIcon && newIcon !== game.settings.get("pf2e", "deathIcon")) {
                await game.settings.set("pf2e", "deathIcon", newIcon);
            }

            const currentDeadAtZero = game.settings.get("pf2e", "automation.actorsDeadAtZero");
            const newDeadAtZero = htmlQuery<HTMLSelectElement>(html, "select[name=actorsDeadAtZero]")?.value;
            if (newDeadAtZero && currentDeadAtZero !== newDeadAtZero) {
                await game.settings.set("pf2e", "automation.actorsDeadAtZero", newDeadAtZero);
            }
        });
    },
};
