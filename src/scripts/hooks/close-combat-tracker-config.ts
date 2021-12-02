/** Add a deathIcon setting to the CombatTrackerConfig application */
export const CloseCombatTrackerConfig = {
    listen: (): void => {
        Hooks.on("closeCombatTrackerConfig", (_app, $html): void => {
            const newIcon = String($html.find<HTMLInputElement>('input[name="deathIcon"]').val()).trim();
            if (newIcon && newIcon !== game.settings.get("pf2e", "deathIcon")) {
                game.settings.set("pf2e", "deathIcon", newIcon);
            }
        });
    },
};
