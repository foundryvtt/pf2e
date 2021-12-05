/** Add a deathIcon setting to the CombatTrackerConfig application */
export const CloseCombatTrackerConfig = {
    listen: (): void => {
        Hooks.on("closeCombatTrackerConfig", async (_app, $html): Promise<void> => {
            const newIcon = String($html.find<HTMLInputElement>('input[name="deathIcon"]').val()).trim();
            if (newIcon && newIcon !== game.settings.get("pf2e", "deathIcon")) {
                await game.settings.set("pf2e", "deathIcon", newIcon);
            }

            const currentDeadAtZero = game.settings.get("pf2e", "automation.actorsDeadAtZero");
            const newDeadAtZero = String($html.find<HTMLSelectElement>('select[name="actorsDeadAtZero"]').val());
            if (currentDeadAtZero !== newDeadAtZero) {
                await game.settings.set("pf2e", "automation.actorsDeadAtZero", newDeadAtZero);
            }
        });
    },
};
